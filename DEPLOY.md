# AI-Mall 生产部署指南

本文档记录从「零服务器」到「线上可访问」的完整一站式部署流程。

---

## 目录

1. [架构概览](#1-架构概览)
2. [第一步：购买云服务器](#2-第一步购买云服务器)
3. [第二步：购买域名（可选）](#3-第二步购买域名可选)
4. [第三步：连接服务器](#4-第三步连接服务器)
5. [第四步：安装 Docker](#5-第四步安装-docker)
6. [第五步：上传项目代码](#6-第五步上传项目代码)
7. [第六步：配置环境变量](#7-第六步配置环境变量)
8. [第七步：构建并启动服务](#8-第七步构建并启动服务)
9. [第八步：验证访问](#9-第八步验证访问)
10. [第九步：配置域名与 HTTPS](#10-第九步配置域名与-https)
11. [第十步：日常运维](#11-第十步日常运维)
12. [常见问题排查](#12-常见问题排查)

---

## 1. 架构概览

项目采用 **单 VPS + Docker Compose** 部署，包含 4 个服务：

| 服务         | 镜像                          | 端口 | 说明                                    |
| ------------ | ----------------------------- | ---- | --------------------------------------- |
| `postgres`   | `pgvector/pgvector:pg16`      | 5432 | 数据库，含 pgvector 扩展                |
| `mall-api`   | 自建（Java 17 + Spring Boot） | 8080 | 商城业务服务，Flyway 自动迁移           |
| `ai-service` | 自建（Next.js 16 standalone） | 3001 | AI 服务，Drizzle 自动迁移               |
| `web`        | 自建（nginx）                 | 80   | 前端静态资源 + 反向代理（唯一对外端口） |

入口层路径约定（与开发环境 Vite proxy 一致）：

- `/` → 前端 SPA（history 路由回退 index.html）
- `/api/mall/**` → mall-api:8080（重写为 `/api/**`）
- `/api/ai/**` → ai-service:3001（重写为 `/api/**`，关闭缓冲支持 SSE 流式）

数据库 Schema 划分：

- `mall` schema：业务表，由 Java 侧 Flyway 管理
- `ai` schema：向量与文档表，由 Next.js 侧 Drizzle 管理

---

## 2. 第一步：购买云服务器

### 2.1 推荐配置

| 项目 | 推荐值           | 说明                                     |
| ---- | ---------------- | ---------------------------------------- |
| CPU  | 2 核             | 构建镜像和 Java 运行吃 CPU               |
| 内存 | 4 GB             | Next.js + Java + PG 同机至少 4G，8G 更稳 |
| 硬盘 | 40 GB SSD        | 镜像 + 数据库足够                        |
| 带宽 | 3 Mbps 起        | 1M 也能用但上传知识库会卡                |
| 系统 | Ubuntu 22.04 LTS | 文档最齐全，社区支持好                   |

### 2.2 国内云厂商选择（任选其一）

- **阿里云**：[轻量应用服务器](https://www.aliyun.com/product/swas) 2核4G 约 ¥100/月，新人有优惠
- **腾讯云**：[轻量应用服务器](https://cloud.tencent.com/product/lighthouse) 2核4G 约 ¥90/月
- **华为云**：价格相近

> 选「轻量应用服务器」即可，比 ECS 便宜且自带防火墙管理，足够个人项目使用。**地域选离你近的**（如华东/华南）。

### 2.3 购买时的关键设置

1. **镜像**：选 Ubuntu 22.04 LTS
2. **登录方式**：选「设置密码」，记好 root 密码
3. **安全组/防火墙**：开放 **22（SSH）、80（HTTP）、443（HTTPS）** 三个端口

购买完成后，记下服务器的**公网 IP**（形如 `47.xx.xx.xx`）。

---

## 3. 第二步：购买域名（可选）

没有域名也能用 IP 访问，但配 HTTPS 和长期使用建议买个域名。

- 国内：阿里云[万网](https://wanwang.aliyun.com/)、腾讯云[DNSPod](https://dnspod.cloud.tencent.com/)，`.com` 约 ¥55/年、`.cn` 约 ¥30/年
- 国外：[Namecheap](https://www.namecheap.com/)、[Cloudflare](https://www.cloudflare.com/)

> ⚠️ 国内域名需**备案**才能在国内服务器上使用 80/443 端口（备案约 7~20 天）。如果不想备案，要么用境外服务器，要么先用 IP 访问，备案下来再绑域名。

---

## 4. 第三步：连接服务器

在本地终端执行：

```bash
ssh root@<你的服务器公网IP>
# 输入购买时设置的 root 密码
```

首次连接会提示确认指纹，输入 `yes` 即可。

---

## 5. 第四步：安装 Docker

连接到服务器后，依次执行：

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Docker（官方脚本，自动适配系统）
curl -fsSL https://get.docker.com | bash

# 启动并设置开机自启
systemctl enable docker
systemctl start docker

# 验证安装
docker --version
docker compose version
```

### 5.1 配置国内镜像加速（国内服务器必做）

```bash
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me"
  ]
}
EOF
systemctl daemon-reload
systemctl restart docker
```

---

## 6. 第五步：上传项目代码

### 6.1 本地打包

在**本地 Mac** 终端执行：

```bash
cd /Users/lixiang/Documents/project/ai/ai-mall

# 打包项目（排除不需要的大文件）
tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='dist' \
    --exclude='target' \
    --exclude='.git' \
    -czf ai-mall.tar.gz .
```

### 6.2 上传到服务器

```bash
scp ai-mall.tar.gz root@<服务器IP>:/opt/
```

### 6.3 服务器上解压

回到**服务器终端**：

```bash
cd /opt
mkdir -p ai-mall
tar -xzf ai-mall.tar.gz -C ai-mall --strip-components=1
cd ai-mall
ls   # 确认能看到 docker-compose.yml、apps、services 等目录
```

---

## 7. 第六步：配置环境变量

### 7.1 创建 .env 文件

在服务器 `/opt/ai-mall` 目录执行：

```bash
cp .env.example .env
```

### 7.2 生成随机 JWT 密钥

```bash
openssl rand -hex 32
# 输出一串 64 位字符，复制下来
```

### 7.3 编辑 .env 文件

```bash
vim .env
```

填入以下内容（替换为你自己的密钥）：

```bash
# ===== 必填 =====

# JWT 密钥（mall-api 和 ai-service 共享，必须为随机长字符串 ≥32 字节）
JWT_SECRET=粘贴上面生成的64位随机字符串

# LLM API Keys
Deepseek_API_KEY=sk-你的deepseek密钥
SILICONFLOW_API_KEY=sk-你的硅基流动密钥（知识库RAG必需）

# ===== 可选 =====
Kimi_API_KEY=sk-你的kimi密钥
```

> `POSTGRES_*`、`DATABASE_URL`、`MALL_API_BASE` 这些不用填，docker-compose.yml 已内置容器网络配置。

保存退出（vim：按 `Esc`，输入 `:wq` 回车）。

### 7.4 关键说明

- **JWT_SECRET 必须设置**，且 mall-api 和 ai-service 使用同一个值（docker-compose 已通过 `${JWT_SECRET}` 注入两个服务）。
- **至少配置一个对话模型 Key**（Deepseek 或 Kimi）和一个 Embedding Key（SILICONFLOW），否则 AI 对话和知识库功能不可用。
- 变量名区分大小写，必须与代码中 `process.env` 读取的完全一致。

---

## 8. 第七步：构建并启动服务

在服务器 `/opt/ai-mall` 目录执行：

```bash
docker compose up -d --build
```

**首次构建约 10~20 分钟**（要拉基础镜像、编译 Java、构建 Next.js），耐心等待。

### 8.1 查看实时日志

```bash
docker compose logs -f
```

成功标志：

- `mall-api`：`Started MallApiApplication in xx seconds`
- `ai-service`：`[ai-service] running drizzle migrations...` 然后 `ready started server on 0.0.0.0:3001`
- `web`：nginx 启动无报错

按 `Ctrl+C` 退出日志查看（服务仍在后台运行）。

### 8.2 首次启动顺序说明

1. `postgres` 先启动，自动执行 `docker/initdb/01-init.sql`：创建 pgvector 扩展、`mall` 和 `ai` schema
2. `mall-api` 启动后，Flyway 自动执行 V1~V7 迁移脚本建表，并由 `DataInitializer` 播种管理员账号 `admin / admin123`
3. `ai-service` 启动后，入口脚本自动执行 `drizzle-kit migrate` 建表，然后启动 Next.js
4. `web`（nginx）最后启动，对外暴露 80 端口

---

## 9. 第八步：验证访问

### 9.1 检查容器状态

```bash
docker compose ps
```

4 个容器都应为 `running`（postgres 还应显示 healthy）。

### 9.2 接口验证

```bash
# AI 服务健康检查
curl http://localhost/api/ai/health
# 期望返回：{"code":0,"message":"ok","data":{"status":"up","service":"ai-service"}}
```

### 9.3 浏览器访问

打开 `http://<你的服务器公网IP>`，应能看到商城首页。

### 9.4 登录后台

使用初始账号登录后台：

- **用户名**：`admin`
- **密码**：`admin123`

> ⚠️ 登录后立即修改默认密码！

### 9.5 验证 AI 功能

进入 AI 对话页面，发一条消息测试流式回复是否正常；测试知识库上传与检索。

---

## 10. 第九步：配置域名与 HTTPS

> 此步骤仅在已有域名时执行。无域名可跳过，直接用 IP 访问。

### 10.1 域名解析

在域名服务商控制台，添加 A 记录：

- 主机记录：`@`（或 `www`）
- 记录类型：A
- 记录值：你的服务器公网 IP

### 10.2 安装 nginx + certbot

```bash
apt install -y nginx certbot python3-certbot-nginx
```

### 10.3 配置宿主机 nginx 反代到容器

> 项目的 nginx 运行在 Docker 容器内，certbot 无法直接操作容器内 nginx。因此在宿主机再装一个 nginx 做 SSL 终结，反代到容器的 80 端口。

```bash
cat > /etc/nginx/sites-available/ai-mall <<'EOF'
server {
    listen 80;
    server_name 你的域名.com www.你的域名.com;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/ai-mall /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 10.4 申请 SSL 证书

```bash
certbot --nginx -d 你的域名.com -d www.你的域名.com
```

按提示输入邮箱、同意协议即可。证书申请成功后会自动配置 HTTPS 并设置自动续期。

现在用 `https://你的域名.com` 访问即可。

---

## 11. 第十步：日常运维

所有命令均在服务器 `/opt/ai-mall` 目录下执行。

### 11.1 查看日志

```bash
# 实时查看所有服务日志
docker compose logs -f

# 查看某个服务
docker compose logs -f ai-service
docker compose logs -f mall-api

# 查看最近 100 行
docker compose logs --tail 100 ai-service
```

### 11.2 重启服务

```bash
# 重启单个服务
docker compose restart ai-service

# 重新构建并重启（代码更新后）
docker compose up -d --build ai-service
```

### 11.3 更新代码后重新部署

本地修改代码后，重新打包上传：

```bash
# 本地
cd /Users/lixiang/Documents/project/ai/ai-mall
tar --exclude='node_modules' --exclude='.next' --exclude='dist' --exclude='target' --exclude='.git' -czf ai-mall.tar.gz .
scp ai-mall.tar.gz root@<服务器IP>:/opt/

# 服务器
cd /opt/ai-mall
tar -xzf /opt/ai-mall.tar.gz --strip-components=1
docker compose up -d --build
```

### 11.4 数据库备份与恢复

```bash
# 备份
docker compose exec postgres pg_dump -U mall -d ai_mall > backup_$(date +%Y%m%d).sql

# 恢复
cat backup_20261018.sql | docker compose exec -T postgres psql -U mall -d ai_mall
```

### 11.5 停止与清理

```bash
# 停止服务（保留数据卷）
docker compose down

# 停止并删除数据卷（⚠️ 会清空数据库，慎用！）
docker compose down -v
```

---

## 12. 常见问题排查

### 12.1 构建时 pnpm install 超时

服务器网络问题。多试几次，或检查 Docker 镜像加速是否生效：

```bash
docker info | grep -A 5 "Registry Mirrors"
```

### 12.2 容器启动后立即退出

查看具体报错：

```bash
docker compose logs <服务名>
```

### 12.3 浏览器访问超时

- 检查云服务器安全组是否放行了 80 端口
- 检查服务器系统防火墙（`ufw status` 或 `firewall-cmd --list-ports`）

### 12.4 AI 服务启动失败：DATABASE_URL 未设置

确保 `.env` 文件存在于 `docker-compose.yml` 同级目录。docker-compose.yml 中 ai-service 的 `DATABASE_URL` 已硬编码为 `postgresql://mall:mall@postgres:5432/ai_mall`，容器内走服务名 `postgres`。

### 12.5 AI 服务报错：relation "ai.xxx" does not exist

Drizzle 迁移未执行成功。检查日志：

```bash
docker compose logs ai-service | grep -i drizzle
```

手动执行迁移：

```bash
docker compose exec ai-service sh -c "cd /app/apps/ai && DATABASE_URL=$DATABASE_URL drizzle-kit migrate"
```

### 12.6 登录后 AI 功能报 401

JWT_SECRET 不一致。检查两个服务的 JWT_SECRET 是否相同：

```bash
docker compose exec mall-api env | grep JWT_SECRET
docker compose exec ai-service env | grep JWT_SECRET
```

两者输出必须完全一致。

### 12.7 知识库上传失败（Embedding 报错）

检查 `SILICONFLOW_API_KEY` 是否配置且有效：

```bash
docker compose exec ai-service env | grep SILICONFLOW
```

### 12.8 流式对话卡住/中断

- 检查 nginx 的 `proxy_buffering off` 配置是否生效（项目 `nginx.conf` 已配置）
- 检查网络是否有中间层（如 CDN）缓冲 SSE 响应
- 如使用了 Cloudflare CDN，需在 Cloudflare 控制台关闭对应路径的缓存

---

## 附录：本次部署相关的代码改动

为支持生产环境自动迁移，对 `apps/ai/Dockerfile` 做了如下修改：

**修改前**：AI 服务容器启动时只运行 `node apps/ai/server.js`，不会执行 Drizzle 数据库迁移，导致 `ai` schema 下的表不存在。

**修改后**：

1. 将 `drizzle/` 迁移文件和 `drizzle.config.ts` 拷贝进最终镜像
2. 全局安装 `drizzle-kit@0.31.10`
3. 新增 `entrypoint.sh` 启动脚本：先执行 `drizzle-kit migrate` 建表，再启动 Next.js 服务

这样 `ai-service` 容器每次启动都会自动检查并应用未执行的迁移，与 mall-api 的 Flyway 行为对齐。
