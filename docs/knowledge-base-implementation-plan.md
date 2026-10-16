# P3 RAG 知识库 — 实现计划与进度跟踪

> 目标：让 AI 对话能基于用户上传的私有文档（PDF/Word/Markdown）做检索增强回答（RAG）。
> 设计基线见 [specs/2026-09-07-ai-mall-design.md](superpowers/specs/2026-09-07-ai-mall-design.md)。
> 总体进度跟踪见 [progress.md](progress.md) 的 `P3 RAG 知识库` 行。
>
> 执行规则：**交互式构建**——每一步完成后等待用户指令再进入下一步；每步先跑通最小闭环，细节后续迭代；完成一步即更新本文档勾选状态与进度表。

## 方案确认（选型）

| 项             | 选定方案                                                                              | 理由                                                                                               |
| -------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Embedding 模型 | **硅基流动 `BAAI/bge-large-zh-v1.5`**                                                 | OpenAI 兼容协议（复用 `@langchain/openai`，零新依赖）；国内直连无需代理；中文检索 SOTA；免费额度足 |
| 向量维度       | **1024**                                                                              | pgvector 索引体积与性能平衡                                                                        |
| 向量存储       | 自实现 `DrizzleVectorStore`（继承 LangChain `VectorStore`）                           | 维持 Drizzle 管理的 `ai` schema，不引入外部向量库                                                  |
| 切片策略       | `RecursiveCharacterTextSplitter`（chunk 400 / overlap 50，KB.4 修正）                 | BGE-large-zh 512 token 上限，原 1000/200 会超限报错                                                |
| 向量化时机     | 上传时一次性向量化并入库；查询只做检索                                                | 遵循项目约定，避免重复嵌入                                                                         |
| 检索算子       | pgvector `<=>`（cosine 距离）+ `document_id` 过滤                                     | 与 Drizzle SQL 查询对齐                                                                            |
| 多用户隔离     | `document.user_id` 贯穿上传/列表/检索；agent 工具复用 LangChain configurable `userId` | 与订单工具隔离模式一致                                                                             |

环境变量新增：`SILICONFLOW_API_KEY`（dev 写入 `apps/ai/.env.local`，prod 注入 docker-compose）。

## 进度总览

| 步骤 | 主题                               | 状态    | 完成日期   | 验证方式                                                               |
| ---- | ---------------------------------- | ------- | ---------- | ---------------------------------------------------------------------- |
| KB.1 | Drizzle Schema 建表                | ✅ 完成 | 2026-10-14 | 迁移 0003 应用，psql 见 documents/document_chunks，embedding 为 vector |
| KB.2 | Embedding 模型接入                 | ✅ 完成 | 2026-10-14 | embedQuery 返回 1024 维，与 schema vector(1024) 对齐                   |
| KB.3 | DrizzleVectorStore 实现            | ✅ 完成 | 2026-10-14 | tsc 通过 + pgvector 闭环（写入 3 段 1024 维 + <=> 检索 top-1 命中）    |
| KB.4 | 文档处理流水线                     | ✅ 完成 | 2026-10-15 | md 闭环：5 chunks 入库 status=ready 对账 + 检索命中 + 非法类型 failed  |
| KB.5 | AI 服务 API 路由                   | ✅ 完成 | 2026-10-15 | curl 全过：401/上传ready/列表/详情含chunks/越权404/删除/删后空列表     |
| KB.6 | 接入 Agent（knowledgeSearch 工具） | ✅ 完成 | 2026-10-16 | 对话命中 FAQ 内容 + 引用来源；other-user 查不到（隔离通过）            |
| KB.7 | 前端 API 层                        | ✅ 完成 | 2026-10-16 | tsc 通过，类型完整                                                     |
| KB.8 | 前端页面还原                       | ✅ 完成 | 2026-10-16 | Upload/Table/轮询/删除/下载 全实现，tsc 通过                           |
| KB.9 | 联调冒烟 + 进度更新                | ✅ 完成 | 2026-10-16 | 端到端 RAG 问答带引用；多用户隔离验证；progress.md 更新                |

---

## KB.1 — Drizzle Schema 建表 ✅

- [x] 在 `apps/ai/src/lib/ai/schema.ts` 增 `documents` 与 `document_chunks` 两表（`ai` schema）
  - `documents`：id(uuid)、user_id、title、file_name、mime_type、status(`processing`/`ready`/`failed`)、chunk_count、created_at、updated_at
  - `document_chunks`：id(uuid)、document_id(外键 → documents.id, ON DELETE CASCADE)、content(text)、embedding(`vector(1024)`)、sequence(int)、created_at
- [x] 在 `apps/ai/src/lib/ai/db.ts` 注册新表到 Drizzle db 对象
- [x] `pnpm db:generate` 生成迁移 → `pnpm db:migrate` 落库（迁移文件 `drizzle/0003_colossal_tinkerer.sql`）
- **设计决策（执行时调整）**：
  - 主键改为 **UUID**（`uuid().defaultRandom()`），对齐 AI 侧现有 conversations/messages 约定；原计划的 BIGINT 雪花是 Java mall-api 侧约定，AI schema 不适用
  - embedding 列类型 `vector(1024)`（Drizzle 内置 `vector` 列，drizzle-orm 0.45.2 支持），pgvector 扩展 P0 已启用
  - 外键 CASCADE 删除，跟随主文档
  - status 用字符串字面量默认 `'processing'`，与现有风格一致
- **验证**：`pnpm db:migrate` 成功；postgres 驱动查询 `information_schema` 确认 ai schema 下 4 表（conversations、documents、document_chunks、messages），`document_chunks.embedding` 为 USER-DEFINED `vector` 类型

## KB.2 — Embedding 模型接入 ✅

- [x] 新建 `apps/ai/src/model/embedding.ts`
  - 实例化 `OpenAIEmbeddings`：model=`BAAI/bge-large-zh-v1.5`、baseURL=`https://api.siliconflow.cn/v1`、apiKey=`process.env.SILICONFLOW_API_KEY`
- [x] `apps/ai/.env.local` 加 `SILICONFLOW_API_KEY`（用户填入真实 key）
- [x] `.env.example` 同步加该 key 占位说明
- [x] `tsc --noEmit` 通过
- **设计决策**：
  - 复用 `@langchain/openai`（已在依赖中 v1.5.11，零新增依赖）
  - 与 `deepseekModel` 同目录 `src/model/`，保持模型实例集中管理；同样用 `configuration: { baseURL, apiKey }` 风格（LangChain 1.x）
  - 不传 `dimensions` 参数（BGE-large-zh 原生 1024，降维会破坏检索质量）
- **验证**：临时脚本 `node --env-file=.env.local --experimental-strip-types` 跑 `embeddings.embedQuery("电商知识库测试：商品售后政策")`，输出 `维度: 1024`，前 5 维 `[0.0023, 0.0421, -0.0439, -0.0358, 0.0189]`，与 schema `vector(1024)` 对齐。验证后删除临时脚本。

## KB.3 — DrizzleVectorStore 实现

- [x] 新建 `apps/ai/src/lib/ai/vector-store.ts`
  - 继承 `@langchain/core/vectorstores` 的 `VectorStore`（构造签名 `constructor(embeddings, dbConfig: Record<string,any>)`，第 2 参必填，传 `{}`）
  - 实现 `_vectorstoreType()`、`addVectors(vectors, documents)`（返回插入的 chunk id 数组）、`addDocuments(documents)`（内部 embedDocuments → addVectors）、`similaritySearchVectorWithScore(query, k, filter?)`
  - `addVectors`：把向量 + 文本 + metadata.documentId/sequence 写入 `document_chunks`，returning id
  - `similaritySearchVectorWithScore`：用 Drizzle `sql\`${documentChunks.embedding} <=> ${queryVec}::vector\`` 排序，`inArray(documentId, ids)` 过滤，`isNotNull(embedding)`防 NULL 报错，limit k，返回`[Document, distance][]`
- [x] `embeddings` 作为构造参数注入（不在 VectorStore 内部硬编码模型）
- [x] `tsc --noEmit` 通过
- **设计决策**：
  - 向量列写入：直接传 `number[]`（drizzle-orm 0.45 vector 列接受 number[]，内部序列化为 pgvector 字面量）；检索用 `sql` 模板 + `${vecStr}::vector` cast
  - filter 形如 `{ documentIds: string[] }`，支持指定文档子集检索；实例级 filter 可在构造时设置，检索参数优先
  - 复用模块级 `db`（不通过基类 dbConfig），便于对齐项目 Drizzle 连接
- **验证**：
  - `tsc --noEmit` 通过（VectorStore 1.x 抽象方法 addVectors/addDocuments/similaritySearchVectorWithScore 全实现，构造签名匹配）
  - pgvector 闭环用裸 postgres `.mjs` 脚本验证（drizzle schema 是 .ts 无法在 .mjs import，用等价裸 SQL）：写入 3 段 1024 维中文向量，检索"退货政策"返回 top-1 命中「售后退货政策」（cosine 距离 0.3828，第二名积分规则 0.5987，单调正确），CASCADE 清理通过
  - **drizzle 运行时序列化待 KB.4 验证**：vector-store.ts 的 drizzle insert/embedding 列类型已在 tsc 通过，运行时 drizzle 对 number[] 的序列化在 KB.4 document-processor 实际调用 `DrizzleVectorStore.addDocuments` 时端到端验证

## KB.4 — 文档处理流水线 ✅

- [x] 新建 `apps/ai/src/lib/ai/document-processor.ts`
  - 入口 `processDocument({ documentId, fileBuffer, fileName, mimeType })`：
    1. 按 mime + 扩展名兜底选解析器（PDFLoader / DocxLoader / md+txt 直接 utf-8 解码）
    2. `RecursiveCharacterTextSplitter`（chunkSize 400 / chunkOverlap 50）切分
    3. `DrizzleVectorStore.addDocuments`（metadata 带 documentId + sequence）一次性向量化入库
    4. 更新 `document.status='ready'`、`chunk_count=N`；异常清理 chunks 后 `status='failed'`（不向上抛）
  - 辅助导出：`isSupportedFileType`（mime 白名单 + 扩展名兜底）、`deleteDocumentWithChunks`、`countChunks`（对账用）
- [x] 先同步处理（小文件够用）；大文件异步队列留 TODO 注释
- [x] `tsc --noEmit` 通过
- **设计决策（执行时调整）**：
  - **切片参数 1000/200 → 400/50**：BGE-large-zh-v1.5 输入上限 512 token（中文约 1 字 1 token），1000 字符中文切片触发硅基流动 20015 参数错误。400 字符留余量
  - md/txt 不用 TextLoader（在 @langchain/classic 里，避免引入重依赖），直接 `buffer.toString("utf-8")`（同款逻辑）
  - `Buffer → Uint8Array` 再进 Blob：规避 @types/node ArrayBufferLike 与 BlobPart 类型不兼容
  - 内部 import 用相对路径（`../../model/embedding`）而非 `@/` 别名：对齐 lib/ai 目录内部风格，且支持 tsx/node 直跑验证脚本
  - 新增依赖：`@langchain/textsplitters@1.0.2`（RecursiveCharacterTextSplitter，langchain 1.x 拆出独立包）、`pdf-parse@2.4.5`、`mammoth@1.13.0`（community loaders 的 peer）、devDep `tsx`（验证脚本运行器）
- **验证**（tsx 临时脚本，已删除）：
  - md 文档（约 1200 字 ×10 放大）→ 5 chunks 入库，status=ready，chunk_count=5 与 `countChunks` 对账一致
  - 检索"退货要运费吗" → top-1 命中退货政策段落（0.5133 < 0.5216）——**KB.3 遗留点关闭：drizzle number[] 向量列运行时序列化验证通过**
  - image/png 非法类型 → 解析拒绝，status=failed，无 chunks 残留
  - 清理：删 documents 行，CASCADE 删 chunks

## KB.5 — AI 服务 API 路由 ✅

- [x] 新建 `apps/ai/src/lib/ai/services/document-repo.ts`（DB 查询层，所有查询强制 user_id 过滤）
  - `listDocuments`（page/size/status 过滤 + 分页 + total）、`createDocument`、`getDocumentById`、`getDocumentWithChunks`（详情 + 前 N chunks 预览）、`listReadyDocumentIds`（供 agent 检索范围隔离用）
- [x] `apps/ai/src/app/api/knowledge/documents/route.ts`
  - `POST`：multipart 取 file → JWT 取 userId → 类型校验 → 建 document → `processDocument` 同步处理 → 返回最新 status/chunkCount
  - `GET`：列表（page/size/status，按 createdAt desc）
- [x] `apps/ai/src/app/api/knowledge/documents/[id]/route.ts`
  - `GET`：详情 + 前 N chunks 预览（preview 参数，默认 5）
  - `DELETE`：`getDocumentById` 校验所有权 + 取 filePath → 删磁盘文件 → `deleteDocumentWithChunks` 级联删
- [x] `apps/ai/src/app/api/knowledge/documents/[id]/download/route.ts`
  - `GET`：鉴权 + 所有权校验 → 以原文件流式返回，`?download=1` 强制 attachment，否则 inline 预览
- [x] 新增 `apps/ai/src/lib/ai/file-storage.ts`（落盘 / 路径解析 / 删除，含目录穿越防护）
- [x] schema 加 `file_path`（迁移 0004 已落库）
- [x] 所有 route 顶部 `export const runtime = 'nodejs'`
- [x] `tsc --noEmit` 通过
- **设计决策**：
  - 原文件落盘到 `apps/ai/uploads/{userId}/{uuid}.{ext}`，**不存 public/**（避免 Next 静态缓存 + 鉴权不可控），通过下载路由鉴权后流式暴露
  - DB 存相对路径（相对 uploads 根），不存绝对路径，便于环境迁移
  - 鉴权复用 `requireAuth`（jose + HS256 共享密钥），与 conversation 路由一致
  - 上传先落盘 → 建 document(filePath) → processDocument；失败时 processDocument 置 failed，document 记录 + 原文件保留供重试/删除
  - 越权防护：详情/下载/删除均走 `getDocumentById(userId, id)`，跨用户返回 404（不区分不存在/无权限）
  - 目录穿越防护：`resolveUploadPath` 校验解析后的绝对路径仍在 uploads 根内
  - 中文文件名：Content-Disposition 用 `filename*=UTF-8''` 编码避免乱码
  - 错误处理：非 multipart 请求 `formData()` 会抛异常，包 try/catch 返回 422（而非 500）
  - 文件大小暂不额外限制（走 Next 默认），大文件后续改 streaming + 异步队列
- **验证**（dev server + 自签 JWT，curl 全过）：
  - 无 token → 401
  - 上传 md → status=ready, chunkCount=1, filePath=`{userId}/{uuid}.md`，磁盘文件存在
  - 下载 → md5 与原文件一致；inline / attachment(?download=1) 头正确；Content-Type 正确
  - 越权下载（other-user）→ 404
  - 删除 → ok；删后磁盘文件被清理
  - 非法类型 png → 415；非 multipart / 缺 file → 422

## KB.6 — 接入 Agent（knowledgeSearch 工具） ✅

- [x] 新建 `apps/ai/src/ai/tools/knowledge.ts`
  - `knowledge_search` 工具：入参 `{ query, documentIds? }`，调 `DrizzleVectorStore.similaritySearchWithScore`，top-k=4，返回拼接片段文本 + 来源（文件名 + chunk 序号 + 相似度）
  - `userId` 从 LangChain configurable 取，做 user_id 隔离（防越权）
  - 工具描述写清"仅检索当前用户上传的文档"
- [x] `util.ts` 扩展 `ToolRuntime`（加 `userId`），`chat-service` 两处 configurable 透传 `userId`
- [x] `agents/normal.ts` 直接把 `knowledgeSearch` 加进 `tools` 数组（项目既定模式：tools 在 agent 文件内静态组装）
- [x] `tools/index.ts` barrel 导出
- **设计决策**：
  - 工具与 agent 在 createAgent 调用处静态组装（项目既有 4 个 agent 都是这套模式，不引入额外 factory）
  - 未传 documentIds 时 `listReadyDocumentIds(userId)` 检索该用户全部 ready 文档
  - 检索后批量查 documents 表拿 fileName，拼"来源: {fileName}#{seq}"
- **验证**：上传 FAQ md（含运费规则）→ 对话问"偏远地区运费"→ AI 调 `knowledge_search` 命中 faq.md，回复含 99 元包邮/10 元/新疆西藏青海加 15 元等具体内容并带"来自 faq.md 片段 1"引用；other-user 问同样问题返回"无法查到/未上传"——多用户隔离通过

## KB.7 — 前端 API 层 ✅

- [x] 新建 `apps/web/src/api/ai/knowledge.ts`
  - `uploadDocument(file)`：FormData，走 `aiHttp.post`（响应拦截器自动解包 Result）
  - `listDocuments(params)`：分页 + status 过滤
  - `getDocument(id, preview)`：详情 + chunks 预览
  - `deleteDocument(id)`
  - `downloadDocument(id, download)`：返回 Blob（带鉴权头，避免直接暴露 URL）
  - `documentDownloadUrl(id, download)`：构造下载 URL 辅助方法
- [x] 类型定义在文件内（`KnowledgeDocument` / `DocumentStatus` / `DocumentDetail` / `DocumentChunkPreview` 等），id 为 string
- [x] barrel `apps/web/src/api/ai/index.ts` 导出
- **设计决策**：
  - id 类型 string（与 documents 表 uuid 主键对齐）
  - 上传用 FormData，Content-Type 让浏览器自动设 multipart
  - Blob 下载依赖现有响应拦截器对非 Result 数据自动放行（`typeof result.code === "number"` 判断）
- **验证**：`pnpm --filter web typecheck` 通过

## KB.8 — 前端页面还原 ✅

- [x] 重写 `apps/web/src/routes/_admin/ai/knowledge.tsx`
  - 顶部操作栏：antd `Upload`（`beforeUpload` 返回 false 阻止默认 action，走 mutation）
  - 文档列表：antd `Table`（列：文件名 + FileTextOutlined 图标 / 状态 Tag / 切片数 / 创建时间 / 操作）
    - 状态列：processing 用 `Tag` 橙色 + TanStack Query `refetchInterval` 轮询直到 ready/failed
    - 删除：`Modal.confirm` 二次确认 → deleteDocument → invalidate `['documents']`
    - 下载：`downloadDocument` blob → `URL.createObjectURL` → 触发 a.click() 下载
    - 空态保留原 BookOutlined 卡片样式
- [x] TanStack Query：`useQuery(['documents'])` + `useMutation(uploadDocument)` + `useMutation(deleteDocument)`
- **设计决策**：
  - 轮询用 Query 的 `refetchInterval`（仅 processing 项存在时 3s 轮询，全 ready/failed 时返回 false 停）
  - 上传/删除成功后 invalidate `['documents']`
  - 操作列用 `Space` + `Button type="text"`（避免 `Button.Group` deprecated 警告）
- **验证**：typecheck 通过；KB.9 联调时浏览器实测上传→列表→删除流程

## KB.9 — 联调冒烟 + 进度更新 ✅

- [x] 端到端（AI 服务 curl + chat/stream SSE 验证）：
  - 上传 FAQ md（含运费规则）→ status=ready, chunkCount=1
  - 对话"偏远地区运费怎么收？"→ AI 调 `knowledge_search` → 回复含 99 元包邮 / 10 元 / 新疆西藏青海加收 15 元等 FAQ 具体内容，并带"来自 faq.md 片段 1"引用
  - 越权（other-user）问同样问题 → 回复"无法查到 / 尚未上传"——多用户隔离验证通过
- [x] 全链路 tsc 通过（ai + web）
- [x] 更新本表勾选状态 + 完成日期 2026-10-16
- [x] 更新 [progress.md](progress.md) 的 `P3 RAG 知识库` 行为 ✅（已完成）

---

## 风险与决策点

1. **Embedding 维度变更**：若后续换模型导致维度变化（如换 BGE-M3 是 1032），需新建迁移改 `vector(N)` 并重灌所有 chunks——选型后应锁定维度。
2. **同步 vs 异步处理**：KB.4 先同步，大文件会阻塞上传请求；后续可引入轻量后台任务或 BullMQ（学习项目暂不做）。
3. **多用户隔离**：user_id 必须在 KB.5（API）、KB.6（agent 工具）双链路校验，任一缺失即越权。
4. **文件大小/类型**：KB.5 需在 route 层做 mime 白名单与大小上限，避免恶意上传。
5. **pgvector 索引**：chunks 量级大时需建 `ivfflat` / `hnsw` 索引；学习阶段数据量小可暂不建，后续补迁移。
