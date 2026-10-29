# ai-mall Docker 部署全链路解析

> 以 `docker-compose.yml` 为入口，串联 Docker 相关的所有核心概念。

---

## 一、整体架构

```
                 ┌─────────────────────────────────────┐
                 │  web (nginx)  ← 唯一对外端口 :80    │
                 │  静态 SPA + 反向代理                │
                 └───────┬───────────────┬────────────┘
            /api/mall/**│               │/api/ai/**
                        │               │
                        ▼               ▼
              ┌──────────────┐   ┌──────────────┐
              │  mall-api    │   │  ai-service   │
              │  Java :8080  │   │  Next :3001   │
              └──────┬───────┘   └──────┬───────┘
                     │                  │ MALL_API_BASE
                     │                  │ http://mall-api:8080
                     └────────┬─────────┘
                              ▼
                      ┌──────────────┐
                      │  postgres    │
                      │  pgvector    │
                      └──────────────┘
```

5 个容器，1 个对外端口（80），其余走容器内网互相通信。

---

## 二、docker-compose.yml 总览

```yaml
services:
  postgres: # 官方镜像，直接 pull
  mall-api: # 自己 build，简写
  ai-service: # 自己 build，完整写法
  web: # 自己 build，完整写法

volumes:
  pgdata: # 命名卷，PostgreSQL 数据持久化
```

### services 里两种镜像来源

| 方式     | 字段     | 含义                                     | 例子                            |
| -------- | -------- | ---------------------------------------- | ------------------------------- |
| 官方镜像 | `image:` | 从 Docker Hub 拉取，本地没缓存时才会去拉 | `image: pgvector/pgvector:pg16` |
| 自己构建 | `build:` | 用本地 Dockerfile 构建，结果存到本机     | `build: ./services/mall-api`    |

两种镜像最终**都存在本机 Docker 的虚拟磁盘里**，通过 `docker images` 或 Docker Desktop 的 Images 面板统一查看。

---

## 三、镜像 vs 容器

这是 Docker 最核心的两个概念，对应两个阶段：

```
docker build / compose up --build
  └─ 执行 Dockerfile 所有指令 → 固化成镜像（只读模板，存进虚拟磁盘）

docker run / compose up
  └─ 基于镜像创建容器（在镜像上加一层可写层，跑 CMD/ENTRYPOINT）
```

|          | 镜像                           | 容器                              |
| -------- | ------------------------------ | --------------------------------- |
| 类比     | 菜谱                           | 做好的菜                          |
| 可否修改 | ❌ 只读                        | ✅ 可写                           |
| 生命周期 | 可以长期存在，可被多个容器复用 | 停了就没了（除非数据存到 volume） |
| 查看方式 | `docker images`                | `docker ps`                       |

**Dockerfile 里的所有指令（FROM/COPY/RUN）都是 build 时执行的**，run 时只执行最后那条 CMD/ENTRYPOINT。

---

## 四、三个 Dockerfile 逐个拆解

### 4.1 mall-api — Java 业务服务

```dockerfile
FROM maven:3.9-eclipse-temurin-17 AS build   # 第一阶段：Maven + JDK 环境
WORKDIR /build
COPY .mvn/settings.xml .mvn/settings.xml     # 阿里云镜像配置
COPY pom.xml ./                               # 依赖清单（单独一层，缓存命中）
RUN mvn -q -s .mvn/settings.xml dependency:go-offline   # 装依赖
COPY src src                                  # 源码（单独一层，改动不触发依赖重装）
RUN mvn -q -s .mvn/settings.xml -DskipTests package     # 编译打 jar

FROM eclipse-temurin:17-jre                   # 第二阶段：只装 JRE，抛弃第一阶段
WORKDIR /app
COPY --from=build /build/target/mall-api-*.jar app.jar  # 从第一阶段拷产物
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]        # run 时执行的命令
```

**关键设计**：

- 两个 `FROM` = **多阶段构建**。第一阶段的 Maven/Git 工具链（几百 MB）全部抛弃，最终镜像只有 JRE + jar（320 MB）
- `AS build` 给阶段起名字，后面才能 `COPY --from=build` 引用
- `COPY pom.xml` 和 `COPY src` 分成两层：改源码只触发 jar 重打，不触发依赖重装

### 4.2 ai-service — Next.js AI 服务

```dockerfile
FROM node:22-alpine AS build                  # 第一阶段：Node 22 构建环境
WORKDIR /repo
RUN corepack enable
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/ai/package.json apps/ai/
COPY apps/web/package.json apps/web/          # workspace 依赖解析需要
RUN pnpm install --filter ai --frozen-lockfile
COPY apps/ai apps/ai
RUN pnpm --filter ai build                     # Next.js standalone 构建

FROM node:22-alpine                           # 第二阶段：Node runtime，抛弃构建工具
WORKDIR /app
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
COPY --from=build /repo/apps/ai/.next/standalone ./          # standalone 自包含产物
COPY --from=build /repo/apps/ai/.next/static ./apps/ai/.next/static
EXPOSE 3001
CMD ["node", "apps/ai/server.js"]
```

**关键设计**：

- Next.js `output: 'standalone'` 模式把用到的 node_modules 子集打包进 `.next/standalone`，可以直接 `node server.js` 启动，镜像极小
- `HOSTNAME=0.0.0.0`：Next 默认监听 localhost，容器里必须改 0.0.0.0 才能让外部（nginx）访问
- context 是仓库根 `.`，因为 pnpm workspace 需要根目录的 lockfile

### 4.3 web — Vite 前端 + nginx

```dockerfile
FROM node:22-alpine AS build                  # 第一阶段：Vite 构建
WORKDIR /repo
RUN corepack enable
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/ai/package.json apps/ai/
RUN pnpm install --filter web --frozen-lockfile
COPY apps/web apps/web
RUN pnpm --filter web build                   # 产出 dist/（index.html + 静态资源）

FROM nginx:1.27-alpine                        # 第二阶段：nginx 托管
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
```

**关键设计**：

- 最终镜像只有 nginx + 静态文件（50 MB），是三个里最小的
- `apps/web/nginx.conf` 放到 nginx 默认站点配置路径 `/etc/nginx/conf.d/default.conf`

---

## 五、多阶段构建详解

三个 Dockerfile 都用了 `FROM ... AS xxx` + `FROM` 的结构，这就是**多阶段构建**：

```
┌──────────────────────────────────────┐
│  第一阶段 FROM (build 环境)          │
│  - 装编译器、构建工具               │
│  - 编译/打包你的源码                │
│  - 产出二进制 / jar / dist         │
└──────────────┬───────────────────────┘
               │ COPY --from=build 只拷产物
               ▼
┌──────────────────────────────────────┐
│  第二阶段 FROM (运行环境)            │
│  - 只装运行时（JRE / Node / nginx）  │
│  - 拷第一阶段的产物                 │
│  - 第一阶段的所有工具链被抛弃        │
└──────────────────────────────────────┘
```

**好处**：最终镜像体积最小。mall-api 从"JDK+Maven+jar"砍到只剩"JRE+jar"，省了几百 MB。

---

## 六、镜像怎么命名

### 6.1 docker-compose 自动命名规则

公式：**`<项目目录名>-<服务名>:latest`**

你的项目目录叫 `ai-mall`，所以：

| compose 服务名 | 自动生成的镜像名            |
| -------------- | --------------------------- |
| `mall-api`     | `ai-mall-mall-api:latest`   |
| `ai-service`   | `ai-mall-ai-service:latest` |
| `web`          | `ai-mall-web:latest`        |

镜像名存在 **Docker Desktop → Images** 面板里，或者用 `docker images` 查看。

### 6.2 自己指定镜像名

在 compose 的 `build` 同级加 `image:` 字段：

```yaml
mall-api:
  build: ./services/mall-api
  image: mall-api:v1.0.0 # 自己起名，覆盖自动命名
```

### 6.3 容器名 ≠ 镜像名

compose 里的 `container_name` 字段控制的是**容器名**，不是镜像名：

```yaml
mall-api:
  container_name: ai-mall-api # 这是容器名，出现在 Containers 面板
```

- **镜像名**：`ai-mall-mall-api`（Images 面板）
- **容器名**：`ai-mall-api`（Containers 面板）

两者互不影响。

---

## 七、Tag 版本管理

### 7.1 Tag 是什么

Docker 镜像的完整标识是 `名字:Tag`。Tag 就是版本号，`latest` 是默认 tag。

### 7.2 为什么你只有 latest

每次 `docker compose up --build` 改完代码重新构建，旧的 `latest` 会被**覆盖**，之前那个版本就丢了。

### 7.3 怎么保留历史版本

方法一：compose 里显式指定

```yaml
mall-api:
  build: ./services/mall-api
  image: mall-api:v1.0.0
```

方法二：build 完手动打 tag

```bash
docker tag mall-api:latest mall-api:v1.0.0
```

Docker Desktop 的 Images 面板里，同一个镜像名下会出现多行，Tag 不同、Image ID 不同。

### 7.4 怎么切版本

compose 里改成只写 image 不写 build：

```yaml
mall-api:
  image: mall-api:v1.0.0 # 引用已有的镜像，不重新 build
```

然后 `docker compose up -d` 就用 v1.0.0 启动，想回退就改 tag。

---

## 八、build 上下文（context）

`build:` 有两种写法：

### 简写

```yaml
mall-api:
  build: ./services/mall-api
```

等价于：

```yaml
mall-api:
  build:
    context: ./services/mall-api
    dockerfile: Dockerfile # 默认值，自动找 context 根目录下的 Dockerfile
```

简写能用的前提：**Dockerfile 就在 context 根目录里**。

### 完整写法

```yaml
web:
  build:
    context: . # 仓库根
    dockerfile: apps/web/Dockerfile # Dockerfile 不在 context 根，必须显式指定
```

### context 是什么

context 是 docker build 时**发给 Docker daemon 的文件集合**。Dockerfile 里所有 `COPY` 的源路径都是**相对 context** 的，不是相对 Dockerfile 文件本身。

| 服务     | context               | Dockerfile 位置                  | COPY 路径相对谁           |
| -------- | --------------------- | -------------------------------- | ------------------------- |
| mall-api | `./services/mall-api` | `./services/mall-api/Dockerfile` | 相对 `services/mall-api/` |
| web      | `.`（仓库根）         | `apps/web/Dockerfile`            | 相对仓库根                |

---

## 九、Docker Desktop Images 面板

### 9.1 面板里每列的含义

| 列       | 含义                         |
| -------- | ---------------------------- |
| Name     | 镜像名（自动生成或手动指定） |
| Tag      | 版本标签，`latest` 是默认    |
| Image ID | 内容哈希，内容变了 ID 就变   |
| Created  | 构建时间                     |
| Size     | 镜像体积                     |
| 🐳 小标  | 正在被容器使用               |

### 9.2 `<none>` 标签的镜像

多阶段构建第一阶段用完被抛弃后，镜像层还留在缓存里，就会出现 `<none>` 标签。可以用 `docker image prune` 清理。

### 9.3 镜像存在哪

macOS Docker Desktop 把所有镜像存在虚拟磁盘文件里：

```
~/Library/Containers/com.docker.docker/Data/vms/0/Docker.raw
```

这是一个大文件（几十 GB），里面是 Linux 虚拟机的文件系统，所有镜像/容器/卷都装在里面，无法用 Finder 直接浏览。

Linux 原生 docker 存在 `/var/lib/docker/overlay2/`。

### 9.4 镜像是分层存的

Docker 用 OverlayFS 把镜像分成多个只读层，层与层叠加成完整文件系统。所有镜像**共享底层**（比如都基于 alpine 的基础层只存一份），自动去重。

元数据类指令（ENV/EXPOSE/WORKDIR/CMD）只改 manifest 配置，不增加文件层。

---

## 十、容器网络与服务发现

### 10.1 为什么用服务名能互相访问

docker-compose 自动为所有容器创建一个**内部网络**，并把每个容器的 `container_name`（同时也是 service 名）注册为 DNS 记录。所以：

```yaml
environment:
  POSTGRES_HOST: postgres # postgres = postgres 服务名，也是内部 DNS 名
  MALL_API_BASE: http://mall-api:8080 # mall-api = mall-api 服务名
```

nginx.conf 里也是一样：

```nginx
proxy_pass http://mall-api:8080/api/;    # mall-api 是 DNS 名
proxy_pass http://ai-service:3001/api/;  # ai-service 是 DNS 名
```

容器**不需要知道对方的 IP 地址**，改容器 IP 也不影响。

### 10.2 Docker 内部网络做了什么

Docker Compose 做了两件事：

1. **创建虚拟局域网**：所有容器连到同一个 bridge 网络，各自分配内网 IP（如 `172.18.0.2`、`172.18.0.3`）
2. **内置 DNS 服务器**：每个容器内置 DNS 解析器（`127.0.0.11`），把服务名解析成对应容器的内网 IP

解析过程：

```
ai-service 发起请求 http://mall-api:8080
    ↓
容器内 DNS 解析器问 Docker："mall-api" 是谁？
    ↓
Docker 回答：mall-api = 172.18.0.3
    ↓
ai-service 直接连接 172.18.0.3:8080
```

本质和公网 DNS 一样（名字 → IP），但 Docker 的是**内部私有的**，只在同一网络内有效。

### 10.3 容器 IP 是私有的，外部访问不到

Docker 给容器分配的 IP 是 `172.18.x.x` 这类 **RFC 1918 私有地址**，只在服务器内部虚拟网络里有效，公网路由器会直接丢弃发往这些地址的包。

```
公网 (互联网)
    │ 只能到达 39.107.89.142 (服务器公网IP)
    ▼
┌──────────────────────────────────────────────┐
│  服务器 39.107.89.142                          │
│                                                │
│  Docker 虚拟网络 (172.18.0.0/16)              │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │postgres  │  │mall-api  │  │ ai-service │  │
│  │172.18.0.2│  │172.18.0.3│  │ 172.18.0.4 │  │
│  └──────────┘  └──────────┘  └────────────┘  │
│       ↑             ↑             ↑           │
│       └─────────────┴─────────────┘           │
│              内部互通（私有 IP）               │
└──────────────────────────────────────────────┘
```

类比：就像家里 WiFi 给手机分配的 `192.168.1.100`，外面的人访问不到，必须通过路由器端口转发。

### 10.4 两种访问路径对比

容器之间互访和外部访问容器，是**两条完全不同的路径**：

|             | 容器之间互访             | 外部访问容器              |
| ----------- | ------------------------ | ------------------------- |
| 地址示例    | `http://mall-api:8080`   | `http://39.107.89.142:80` |
| 解析方式    | Docker 内部 DNS          | 公网 IP + 端口转发        |
| 经过 DNS 吗 | ✅ 是                    | ❌ 否（直接转发）         |
| 谁能访问    | 仅同一 Docker 网络的容器 | 任何人（端口开放时）      |

**外部访问走的是端口转发（iptables），不是 DNS 解析。**

`ports: - "80:80"` 的含义：把宿主机 80 端口收到的 TCP 流量，**直接转发**到 web 容器的 80 端口，纯网络层转发，不涉及 DNS。

### 10.5 哪些容器暴露端口

| 服务       | ports       | 对外可访问      |
| ---------- | ----------- | --------------- |
| postgres   | `5432:5432` | ✅ 开发调试用   |
| mall-api   | 无          | ❌ 仅内网       |
| ai-service | 无          | ❌ 仅内网       |
| web        | `80:80`     | ✅ 唯一对外入口 |

mall-api 和 ai-service 故意不暴露端口——这是"仅内网"约束的实现。外部访问只能通过 nginx 反向代理。

### 10.6 如果给 ai-service 加 ports 会怎样

```yaml
ai-service:
  ports:
    - "3001:3001" # 加了这行
```

外部就能直接通过 `http://服务器IP:3001/api/chat` 访问 AI 服务。

**但生产环境不建议这样做**，原因：

- 统一入口走 nginx，方便路由、日志、限流
- 减少攻击面，后端服务不直接暴露
- nginx 已配置 `proxy_buffering off` 支持 SSE 流式响应

只有临时调试时才加，用完删掉。

---

## 十一、环境变量传递

compose 的 `environment` 字段把值注入到**容器进程**的环境变量里。

### 11.1 Java 服务读 PG 连接信息

```yaml
mall-api:
  environment:
    POSTGRES_HOST: postgres
    POSTGRES_PORT: "5432"
    POSTGRES_DB: ai_mall
    POSTGRES_USER: mall
    POSTGRES_PASSWORD: mall
```

Java 应用通过 `System.getenv("POSTGRES_HOST")` 读取，或者 Spring Boot 自动绑定。

### 11.2 AI 服务调 Java

```yaml
ai-service:
  environment:
    MALL_API_BASE: http://mall-api:8080
```

对应 [apps/ai/src/lib/mall-server.ts](apps/ai/src/lib/mall-server.ts)：

```ts
const BASE = process.env.MALL_API_BASE ?? "http://localhost:8080";
```

### 11.3 .env 文件与变量替换

Docker Compose 会**自动读取** `docker-compose.yml` 同级目录下的 `.env` 文件，用里面的值替换 yml 中的 `${VAR}`。

`.env` 示例：

```bash
JWT_SECRET=abc123xyz
Deepseek_API_KEY=sk-xxx
SILICONFLOW_API_KEY=sk-yyy
```

yml 中引用：

```yaml
ai-service:
  environment:
    JWT_SECRET: ${JWT_SECRET:-默认值} # .env 有值 → 用 .env 的值
    Deepseek_API_KEY: ${Deepseek_API_KEY:-} # .env 没设 → 用空字符串
```

#### `${VAR:-默认值}` 语法

| 写法                    | 含义                   |
| ----------------------- | ---------------------- |
| `${JWT_SECRET:-默认值}` | .env 没设 → 用"默认值" |
| `${Deepseek_API_KEY:-}` | .env 没设 → 用空字符串 |
| `${JWT_SECRET}`         | .env 没设 → 直接报错   |

#### 完整数据流

```
.env 文件（项目根目录）
    ↓ Docker Compose 自动读取
变量替换（把 ${VAR} 替换成实际值）
    ↓
docker-compose.yml 的 environment: 段
    ↓
容器内部的环境变量（process.env / System.getenv）
```

> 注意：`.env` **不会注入到宿主机系统环境**，只在 Compose 解析 yml 时用于变量替换。容器内的环境变量来自替换后的 `environment:` 段。

#### 哪些变量必须写进 .env

看 yml 里哪些用了 `${...}`：

| 变量                  | 用途                                      | 是否必填           |
| --------------------- | ----------------------------------------- | ------------------ |
| `JWT_SECRET`          | JWT 签名密钥，mall-api 和 ai-service 共享 | ✅ 必填            |
| `JWT_EXPIRATION`      | token 有效期                              | ❌ 有默认值        |
| `Deepseek_API_KEY`    | DeepSeek 对话模型                         | 至少填一个对话模型 |
| `Kimi_API_KEY`        | Kimi 对话模型                             | 可选               |
| `SILICONFLOW_API_KEY` | 硅基流动 Embedding                        | 知识库功能必填     |

`POSTGRES_*`、`DATABASE_URL`、`MALL_API_BASE` 在 yml 中是硬编码的，不需要写进 `.env`。

#### 验证替换结果

```bash
docker compose config | grep JWT_SECRET
# 输出替换后的值
```

---

## 十二、depends_on 启动顺序

compose 的 `depends_on` 有两种模式：

### 12.1 service_started（默认）

```yaml
ai-service:
  depends_on:
    mall-api:
      condition: service_started
```

只要 mall-api 的**容器启动了**（进程跑起来了）就算数，不关心它有没有准备好。

### 12.2 service_healthy

```yaml
mall-api:
  depends_on:
    postgres:
      condition: service_healthy
```

必须等 postgres 的**健康检查通过**才算数。健康检查配置在 postgres 服务里：

```yaml
postgres:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U mall -d ai_mall"]
    interval: 5s # 每 5 秒探测一次
    timeout: 3s # 单次探测超时 3 秒
    retries: 10 # 最多重试 10 次
```

### 12.3 web 用的是简写

```yaml
web:
  depends_on:
    - mall-api
    - ai-service
```

只有服务名没有 condition，等价于 `service_started`。

### 12.4 完整启动时序

```
postgres 启动 → 健康检查通过
  ├─ mall-api 启动（等 postgres healthy）
  │   └─ mall-api 容器 started
  └─ ai-service 启动（等 postgres healthy + mall-api started）
      └─ nginx 启动（等 mall-api + ai-service started）
          └─ nginx 监听 :80，对外可访问
```

---

## 十三、volumes 数据持久化

### 13.1 为什么需要 volume

容器删除后，容器内的可写层数据也跟着没了。PostgreSQL 的数据必须持久化到容器外部。

### 13.2 命名卷 vs 绑定挂载

```yaml
postgres:
  volumes:
    - pgdata:/var/lib/postgresql/data # 命名卷（docker 管理）
    - ./docker/initdb:/docker-entrypoint-initdb.d:ro # 绑定挂载（项目目录映射）

volumes:
  pgdata: # 声明命名卷
```

| 类型     | 写法                          | 数据存在哪        | 谁管理 |
| -------- | ----------------------------- | ----------------- | ------ |
| 命名卷   | `pgdata:/var/lib/...`         | Docker 虚拟磁盘里 | Docker |
| 绑定挂载 | `./host/path:/container/path` | 宿主机项目目录    | 你自己 |

### 13.3 initdb 脚本

`docker-entrypoint-initdb.d` 是 PostgreSQL 官方镜像的约定——**首次启动**时自动执行该目录下的 `.sql` / `.sh` 文件，用来初始化数据库（建 schema 等）。`ro` 表示只读挂载，容器内改不了。

---

## 十四、nginx 反向代理原理

### 14.1 nginx.conf 的三个 location

```nginx
# 1. SPA 静态资源 + history 路由回退
location / {
    try_files $uri $uri/ /index.html;
}

# 2. mall-api 反向代理（路径重写 /api/mall → /api）
location /api/mall/ {
    proxy_pass http://mall-api:8080/api/;
}

# 3. ai-service 反向代理（流式响应关键配置）
location /api/ai/ {
    proxy_pass http://ai-service:3001/api/;
    proxy_buffering off;       # 关闭缓冲，支持 LLM SSE 流式输出
    proxy_read_timeout 300s;   # 放宽超时，长对话可能超过 60s
}
```

### 14.2 路径重写规则

`proxy_pass` 带末尾斜杠时，nginx 会把 location 匹配到的前缀替换成 proxy_pass 里的路径：

```
请求: /api/mall/products
  → location /api/mall/ 匹配
  → proxy_pass http://mall-api:8080/api/
  → 重写为: http://mall-api:8080/api/products  ✅

请求: /api/ai/chat
  → location /api/ai/ 匹配
  → proxy_pass http://ai-service:3001/api/
  → 重写为: http://ai-service:3001/api/chat   ✅
```

### 14.3 流式响应为什么要 proxy_buffering off

默认 nginx 会把后端响应完整缓存后再转发。LLM 的 SSE 流式输出是一字一字吐 token，默认配置下用户要等全部生成完才看到。关闭缓冲后，nginx 收到字节就立即透传。

### 14.4 开发环境 vs 生产环境

| 环境 | 入口层                | 路径约定                                   |
| ---- | --------------------- | ------------------------------------------ |
| 开发 | Vite dev server proxy | `/api/mall/**` → Java, `/api/ai/**` → Next |
| 生产 | nginx 反向代理        | 完全相同的路径前缀                         |

前端代码只写 `mallHttp.get('/products')` → axios baseURL 是 `/api/mall` → 实际请求 `/api/mall/products` → dev 走 Vite proxy 重写，prod 走 nginx 重写。**前端代码零改动**。

---

## 十五、国内服务器拉取镜像失败与离线导入

### 15.1 现象

在阿里云 ECS 上执行 `docker compose up -d --build`，构建阶段卡在 `load metadata` 30 秒后超时：

```
 => ERROR [web internal] load metadata for docker.io/library/nginx:1.27-alpine                 30.4s
 => ERROR [mall-api internal] load metadata for docker.io/library/maven:3.9-eclipse-temurin-17 30.3s
 => ERROR [mall-api internal] load metadata for docker.io/library/eclipse-temurin:17-jre       30.3s
target mall-api: failed to solve: eclipse-temurin:17-jre:
  failed to resolve source metadata for docker.io/library/eclipse-temurin:17-jre: not found
```

> 注意：这里的 `not found` **不是因为镜像不存在**，而是加速器/网络解析不到该 tag 时返回的错误。`node:22-alpine` 之所以没报错，只是因为它已经在服务器本机缓存里。

### 15.2 本项目依赖的 5 个基础镜像

| 镜像                             | 用途             | 出现在哪                        |
| -------------------------------- | ---------------- | ------------------------------- |
| `node:22-alpine`                 | web / ai 构建    | web、ai Dockerfile 第一阶段     |
| `nginx:1.27-alpine`              | web 运行         | web Dockerfile 第二阶段         |
| `maven:3.9-eclipse-temurin-17`   | mall-api 构建    | mall-api Dockerfile 第一阶段    |
| `eclipse-temurin:17-jre`         | mall-api 运行    | mall-api Dockerfile 第二阶段    |
| `pgvector/pgvector:pg16`         | PostgreSQL 数据库 | docker-compose.yml `postgres`  |

### 15.3 原因

- Docker Hub 在国内 ECS 上直连极慢或完全不可达，表现为 30s 连接超时
- 公共镜像加速源（DaoCloud、1Panel、1ms 等）对 ECS 实例普遍**限流**，表现为间歇性 `not found`
- `/etc/docker/daemon.json` 中镜像地址若被**反引号包裹**，会生成非法 URL，Docker 静默回退到直连 Docker Hub（实测约 9KB/s）

### 15.4 先做两个廉价排查

```bash
uname -m                                        # 确认服务器架构，决定导出时用哪个 platform
curl -I -m 5 https://registry-1.docker.io/v2/   # 确认能否直连 Docker Hub
```

### 15.5 解决方案：本地导出 + 服务器导入

在线拉取不可靠时，把基础镜像在能联网的机器上导出，再传到服务器 `docker load` 导入，是 100% 可靠的兜底方案。

**第一步：本地 Mac 拉取并打包**（`--platform` 必须与服务器架构一致）

```bash
mkdir -p ~/Downloads/ai-mall-images && cd ~/Downloads/ai-mall-images

for img in node:22-alpine nginx:1.27-alpine maven:3.9-eclipse-temurin-17 eclipse-temurin:17-jre pgvector/pgvector:pg16; do
  docker pull --platform linux/amd64 "$img"
done

docker save -o images.tar \
  node:22-alpine \
  nginx:1.27-alpine \
  maven:3.9-eclipse-temurin-17 \
  eclipse-temurin:17-jre \
  pgvector/pgvector:pg16

gzip images.tar    # 产出 images.tar.gz
```

**第二步：上传到服务器**

```bash
scp images.tar.gz root@<服务器IP>:/root/
```

**第三步：服务器导入**

```bash
gunzip -c /root/images.tar.gz | docker load    # 也可 docker load -i images.tar.gz
docker images                                  # 确认 5 个镜像都已到位
```

**第四步：正常构建启动**

```bash
cd /opt/ai-mall
docker compose up -d --build
```

### 15.6 关键点

| 要点                        | 说明                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| `--platform linux/amd64`    | Apple Silicon Mac 默认导出 arm64 镜像，x86_64 服务器跑不起来；显式指定后导出的才是服务器可用架构       |
| `docker save/load` 保留 tag | 导入后的 `repo:tag` 与 Dockerfile 中 `FROM` 写的完全一致，构建时无需改动任何文件                       |
| 只解决基础镜像              | 构建阶段内部的联网（pnpm→npmmirror、npm→npmmirror、maven→`settings.xml` 里的阿里云仓库）走的是国内源，不受 Docker Hub 影响，因此导入后构建能顺利跑完 |
| 大文件传输                  | 压缩包通常 500–800MB；scp 慢可拆成单镜像分别传：`docker save -o node-22-alpine.tar node:22-alpine`     |

### 15.7 镜像加速器配置（可选尝试）

若仍想试在线方案，编辑 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": [
    "https://<你的专属ID>.mirror.aliyuncs.com",
    "https://docker.m.daocloud.io",
    "https://docker.1panel.live"
  ]
}
```

```bash
systemctl daemon-reload && systemctl restart docker
docker info | grep -A5 "Registry Mirrors"    # 确认加速源已生效
```

> ⚠️ 地址**不要加反引号**，否则会生成非法 URL 导致静默失败。公共源的限流问题依然存在，能离线导入时优先走 15.5 的离线方案。

---

## 十六、常用命令速查

### 构建与启动

```bash
docker compose up -d              # 构建（如有需要）+ 后台启动所有服务
docker compose up -d --build      # 强制重新 build 再启动
docker compose build              # 只 build，不启动容器
docker compose build mall-api     # 只 build 某个服务
```

### 查看状态

```bash
docker images                     # 查看本地镜像列表
docker ps                         # 查看运行中的容器
docker compose ps                 # 查看 compose 管理的容器状态
docker compose logs -f web        # 查看 nginx 实时日志
docker compose logs -f mall-api   # 查看 Java 服务日志
```

### 进入容器调试

```bash
docker exec -it ai-mall-web sh           # 进入 nginx 容器
docker exec -it ai-mall-api sh           # 进入 Java 容器
docker exec -it ai-mall-postgres psql -U mall -d ai_mall   # 进入 PG
```

### 停止与清理

```bash
docker compose down               # 停掉并删除容器（保留镜像和 volume）
docker compose down -v            # 停掉并删除容器 + 删除 volume（⚠️ 数据库数据丢失）
docker image prune                # 清理 dangling 镜像（<none> 标签）
docker system prune               # 清理所有未使用的镜像/容器/网络
```

### 镜像管理

```bash
docker tag ai-mall-mall-api:latest mall-api:v1.0.0   # 给镜像打新 tag
docker image rm mall-api:v1.0.0                       # 删除某个 tag 的镜像
docker image history ai-mall-mall-api                 # 查看镜像层历史
docker image inspect ai-mall-mall-api                 # 查看镜像元数据
```
