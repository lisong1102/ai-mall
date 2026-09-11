# ai-mall

以电商订单管理为业务主题的全栈 AI 作品集项目：Vite 前端 + Next.js AI 服务（LangChain.js 编排 / 流式对话）+ Spring Boot 业务服务，AI 客服通过 RAG 与 Tool Calling 打通真实业务。

## 结构

| 路径 | 说明 |
|---|---|
| [apps/web](apps/web) | Vite + React + TanStack Router/Query：商城前端（纯 SPA） |
| [apps/ai](apps/ai) | Next.js 纯 API：AI 服务（/api/chat、LangChain、Drizzle 管理 ai schema） |
| [services/mall-api](services/mall-api) | Spring Boot 3：商品/订单/售后/客户 CRUD |
| [docker](docker) | PostgreSQL 初始化脚本 |
| [docs](docs) | 设计文档与[构建进度](docs/progress.md) |

## 架构与调用链

```
浏览器 → 入口层（dev: Vite proxy / prod: nginx）
           ├── /            → apps/web 静态资源
           ├── /api/mall/** → mall-api:8080（商城业务，前端直连 Java）
           └── /api/ai/**   → ai-service:3001（AI 对话）
AI 服务 →（服务端工具调用，内网）→ mall-api:8080
两个后端共享同一 PostgreSQL：mall / ai schema 隔离，互不跨库访问
```

## 快速开始（本地开发）

```bash
cp .env.example .env   # 填入 DEEPSEEK_API_KEY / ZHIPU_API_KEY
pnpm install
pnpm db:up             # PostgreSQL 16 + pgvector
pnpm dev               # 同时拉起 Vite(5173) + Next AI(3001) + Spring Boot(8080)
```

- 前端：http://localhost:5173
- AI 服务：http://localhost:3001/api/health
- Java API：http://localhost:8080（Swagger：/swagger-ui.html）

## 全栈容器化（模拟线上）

```bash
docker compose up -d --build   # postgres + mall-api + ai-service + web(nginx)
```

- 唯一入口：http://localhost（nginx 反代 /api/mall 与 /api/ai，AI 接口关闭缓冲支持流式）

详细设计与分期计划见 [docs/superpowers/specs/2026-09-07-ai-mall-design.md](docs/superpowers/specs/2026-09-07-ai-mall-design.md)。
