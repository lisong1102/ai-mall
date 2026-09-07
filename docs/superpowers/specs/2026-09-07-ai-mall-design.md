# AI 电商（ai-mall）· 设计文档

- 日期：2026-09-07
- 状态：已确认（用户基本认可，进入搭建）
- 性质：学习 / 作品集项目
- 变更记录：2026-09-07 业务主题由「智能校园」改为「电商」（更贴合 AI 客服场景）

## 1. 项目定位

以「电商订单管理」为业务主题的全栈 AI 项目：

1. **业务管理系统**：商品、订单、售后、客户的常规管理后台（CRUD）
2. **AI 客服智能问答**：基于店铺知识库（退货政策、配送说明、FAQ、商品资料）的 RAG 问答 + 多轮流式对话
3. **智能业务对接**：AI 对话中通过 Tool Calling 调用 Java 业务接口（查订单、查库存、查物流、创建售后申请），以及商品文案/公告 AI 草稿生成

AI 能力必须自然嵌入业务，不做生硬拼接。

## 2. 技术选型决策（含理由）

| 决策点 | 选择 | 理由 |
|---|---|---|
| 项目目的 | 学习/作品集 | 架构从简，精力集中在 AI 深度 |
| 业务主题 | 电商 | AI 客服场景最自然：政策问答、订单查询、售后、商品推荐 |
| Java 后端 | 保留（Spring Boot 业务 CRUD） | 用户要熟悉 Java，且后续可能对接 Java 业务系统 |
| LLM | DeepSeek-V3（对话） | 国内直连、OpenAI 兼容、成本低、中文能力强 |
| Embedding | 智谱 Embedding-3 | **DeepSeek 无 Embedding 接口**，智谱有免费额度且国内可用 |
| 向量库 | PostgreSQL + pgvector | 免维护独立向量库，与业务库统一 |
| AI 编排 | LangChain.js | RAG 链、Tool Calling Agent、文本切分 |
| 流式/UI | Vercel AI SDK | useChat、Data Stream 协议、工具调用 UI 渲染 |
| 仓库结构 | 单仓 polyglot monorepo | pnpm workspace 管 TS 侧；Java 为独立 Maven 工程，代码同仓、根脚本统一编排 |

### LangChain.js 与 Vercel AI SDK 分工

- **LangChain.js = AI 编排层**：RAG 检索链、Agent、Tools、Prompt 模板、对话历史
- **Vercel AI SDK = 流式传输 + UI 层**：`streamText` 流式协议、`useChat` Hook
- 集成方式：LangChain.js 链/Agent 产出经 AI SDK Data Stream 桥接至前端

## 3. 整体架构

```
ai-mall/  (单 git 仓库，pnpm workspace + Maven 双构建)
├── apps/web/                 Next.js 15 全栈应用
│   ├── 管理后台页面（商品/订单/售后/客户 CRUD）
│   ├── AI 客服聊天页（useChat 流式）
│   ├── /api/chat/*           AI 链路：LangChain.js 编排 + AI SDK 流式
│   └── /api/mall/*           BFF 转发层（鉴权后调 Java）
├── services/mall-api/        Spring Boot 3 业务服务（Java 17）
│   └── 商品/订单/售后/客户/政策 的分层 CRUD（REST）
├── docs/                     设计文档与进度记录
└── docker-compose.yml        PostgreSQL 16 + pgvector
```

### 三条数据流

1. **业务线**：管理后台 → Next BFF（/api/mall/*）→ Java REST → PostgreSQL
   - 业务表结构由 Java 侧 Flyway 管理
2. **AI 问答线**：聊天页 → /api/chat → LangChain.js Agent
   - RAG：问题 Embedding → pgvector 相似检索知识库 chunk（政策/FAQ/商品资料）→ 注入上下文
   - Tool Calling：Agent 按意图调用工具 → HTTP 请求 Java 业务接口
   - 生成：DeepSeek 输出 → AI SDK 流式回前端
3. **知识库入库线**：后台维护政策/FAQ/商品资料文档 → LangChain 文本切分 → 智谱 Embedding → pgvector
   - AI 相关表（documents、chunks）由 Next 侧 Drizzle 管理，与业务表同库不同 schema

### 数据库 schema 划分

- `mall` schema：product、category、customer、order、order_item、after_sale（Flyway 管理，Java 拥有）
- `ai` schema：document、document_chunk(embedding vector)（Drizzle 管理，Next 拥有）

### AI 能力清单（电商场景映射）

| AI 能力 | 场景 | 实现 |
|---|---|---|
| 政策/FAQ 问答 | 「退货期限多久」「运费谁承担」 | RAG（pgvector） |
| 订单查询 | 「我的订单 12345 到哪了」 | Tool → Java 订单/物流接口 |
| 售后办理 | 「这件衣服不合适，帮我退货」 | Tool → Java 售后创建接口 |
| 商品推荐 | 「推荐一款 200 元内的耳机」 | Tool → Java 商品检索 + RAG 商品资料 |
| 文案生成 | 商品描述/公告草稿 | DeepSeek 生成（管理后台辅助） |

## 4. 技术清单

### 前端 apps/web

| 类别 | 技术 |
|---|---|
| 框架 | Next.js 16（App Router，实际以 create-next-app 当前版本为准）、React 19、TypeScript |
| UI | Tailwind CSS、shadcn/ui |
| 数据 | TanStack Query（业务 CRUD）、react-hook-form + zod（表单校验） |
| AI 流式 | ai、@ai-sdk/react（useChat） |

### AI 编排（apps/web 内 lib/ai）

| 类别 | 技术 |
|---|---|
| 编排 | langchain、@langchain/core、@langchain/openai（接 DeepSeek 兼容接口） |
| 向量 | @langchain/community（PGVectorStore） |
| ORM | drizzle-orm + drizzle-kit |

### 后端 services/mall-api

| 类别 | 技术 |
|---|---|
| 框架 | Java 17、Spring Boot 3、Spring Web、Validation |
| 持久层 | MyBatis-Plus（国内主流）、PostgreSQL Driver、Flyway（迁移） |
| 文档 | springdoc-openapi（Swagger UI） |
| 规范 | Lombok、统一返回包装 Result、@RestControllerAdvice 全局异常 |

### 基础设施与工程化

| 类别 | 技术 |
|---|---|
| 数据库 | PostgreSQL 16 + pgvector（Docker Compose） |
| 认证 | Auth.js v5（P1 接入管理后台）；AI 客服匿名 + 限流 |
| 测试 | Vitest（TS）、JUnit 5 + MockMvc（Java） |
| 部署 | 本地 Docker Compose；后期 Vercel(web) + VPS/Railway(Java) |

## 5. 分期构建计划

| 阶段 | 内容 | 可演示成果 |
|---|---|---|
| P0 脚手架 | monorepo、docker-compose、前后端空壳互通 | 两个服务启动，健康检查互通 |
| P1 业务底座 | Java 商品/类目/客户/订单/售后 CRUD + Flyway + Swagger；Next 登录 + 管理后台 CRUD（BFF 调通 Java） | 完整电商管理后台 |
| P2 AI 对话 | /api/chat + DeepSeek 多轮流式对话 | 可聊天的客服页面 |
| P3 RAG 知识库 | 政策/FAQ/商品资料→切分→Embedding→pgvector→带引用问答 | 店铺知识库问答 |
| P4 Tool Calling | Agent 调 Java（查订单/物流/库存、创建售后），对话内工具卡片 | AI 办业务 |
| P5 打磨 | 商品文案 AI 草稿、限流、错误处理、测试、README + 录屏 | 作品集成品 |

每阶段独立可演示，P1→P4 即作品集叙事线。

## 6. 错误处理原则

- **AI 侧**：模型超时/限流重试（maxRetries）、Tool 失败降级为文本解释、流中断前端可重发
- **Java 侧**：@RestControllerAdvice 统一异常、参数校验（Validation）、统一返回包装
- **BFF 侧**：Java 错误码透传并标准化

## 7. 测试策略

- TS：Vitest 单测（lib/ai 链路与工具，mock 模型）
- Java：JUnit 5 + MockMvc 分层测试
- E2E：Playwright（P5 视情况）
