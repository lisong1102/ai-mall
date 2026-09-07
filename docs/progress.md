# 构建进度跟踪

> 每完成一个阶段/任务就更新此表，作为回归对照与项目快速预览入口。
> 设计细节见 [specs/2026-09-07-ai-mall-design.md](superpowers/specs/2026-09-07-ai-mall-design.md)
> 变更记录：2026-09-07 主题由「智能校园」改为「电商」，目录 smart-campus → ai-mall

## 阶段总览

| 阶段 | 状态 | 完成日期 | 验证方式 | 备注 |
|---|---|---|---|---|
| P0 脚手架 | ✅ 完成 | 2026-09-07 | BFF /api/mall/health 返回 Java Result；首页显示"已连接 · mall-api" | |
| P1 业务底座 | ⬜ 未开始 | | Swagger 全接口可用 + 后台商品/订单 CRUD 页面 | |
| P2 AI 对话 | ⬜ 未开始 | | 页面内多轮流式对话 | |
| P3 RAG 知识库 | ⬜ 未开始 | | 政策/FAQ 问答带引用 | |
| P4 Tool Calling | ⬜ 未开始 | | 对话中查订单/物流/库存、创建售后 | |
| P5 打磨 | ⬜ 未开始 | | 测试通过 + 演示录屏 | |

## P0 任务清单

- [x] 设计文档与进度文档
- [ ] monorepo 根结构（pnpm workspace、docker-compose、.env.example）
- [ ] services/mall-api Spring Boot 骨架（含健康检查接口）
- [ ] apps/web Next.js 骨架（含 AI SDK / LangChain.js 依赖）
- [ ] 验证：pnpm install、Maven 编译、前后端启动互通

## 环境要求（新机器快速预览）

- Node 22+ / pnpm 10+
- Java 17（无需本地装 Maven，用 `./mvnw`）
- Docker（PostgreSQL 16 + pgvector）
- 环境变量：复制 `.env.example` 为 `.env`，填入 `DEEPSEEK_API_KEY`、`ZHIPU_API_KEY`

## 常用命令

```bash
docker compose up -d          # 启动数据库
pnpm dev                      # 同时拉起 Next(3000) 与 Spring Boot(8080)
pnpm --filter web build       # 构建前端
cd services/mall-api && ./mvnw spring-boot:run   # 单独起 Java
```
