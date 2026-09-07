# ai-mall

以电商订单管理为业务主题的全栈 AI 作品集项目：Next.js 全栈（Vercel AI SDK 流式 + LangChain.js 编排）+ Spring Boot 业务服务，AI 客服通过 RAG 与 Tool Calling 打通真实业务。

## 结构

| 路径 | 说明 |
|---|---|
| [apps/web](apps/web) | Next.js 15：管理后台 + AI 客服 + BFF + AI 编排 |
| [services/mall-api](services/mall-api) | Spring Boot 3：商品/订单/售后/客户 CRUD |
| [docs](docs) | 设计文档与[构建进度](docs/progress.md) |

## 快速开始

```bash
cp .env.example .env   # 填入 DEEPSEEK_API_KEY / ZHIPU_API_KEY
pnpm install
pnpm db:up             # PostgreSQL 16 + pgvector
pnpm dev               # 同时拉起 Next(3000) 与 Spring Boot(8080)
```

- 前端：http://localhost:3000
- Java API：http://localhost:8080（Swagger：/swagger-ui.html）

详细设计与分期计划见 [docs/superpowers/specs/2026-09-07-ai-mall-design.md](docs/superpowers/specs/2026-09-07-ai-mall-design.md)。
