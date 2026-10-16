import {
  pgSchema,
  uuid,
  text,
  timestamp,
  integer,
  index,
  jsonb,
  vector,
} from "drizzle-orm/pg-core";

/**
 * AI 服务的表结构定义（纯声明，不含运行时连接）。
 *
 * 约定：
 * - ai service 只操作 `ai` schema 下的表；Java mall-api 操作 `mall` schema。
 * - 建表/改表用 Drizzle Kit（drizzle.config.ts）生成 migration，不手写 SQL。
 * - 此文件被 drizzle-kit generate 读取，不能包含会执行副作用的代码（如建连接）。
 */

const ai = pgSchema("ai");

/**
 * 会话表：一次连续的多轮对话。
 * - id: UUID 主键，前端用作 conversationId 透传
 * - user_id: 所属用户标识（来自 Java 端 JWT 解析后的用户 id）
 * - title: 会话标题，默认用首条用户消息截断
 * - agent_key: 绑定的 agent 标识（见 apps/ai/src/agents/index.ts）
 *   建会话时确定，之后不变；切 agent 等于开新会话，保证上下文人设一致
 */
export const conversations = ai.table(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull().default("新对话"),
    agentKey: text("agent_key").notNull().default("normal"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("conversations_user_idx").on(t.userId)],
);

/**
 * 消息表：会话里的每一条消息（user / assistant）。
 * - conversation_id 外键关联会话，级联删除
 * - role 只存 user / assistant；system prompt 每次动态注入不入库
 * - content 是纯文本（流式结束后累加的完整回复）
 */
export const messages = ai.table(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    // MessagePart[]：[{type:"text",text}|{type:"approval",...}|{type:"component",...}]
    content: jsonb("content").notNull(),
    // 状态类信息：{ approval?: ApprovalMeta }
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("messages_conv_idx").on(t.conversationId)],
);

/**
 * 文档表：用户上传到知识库的原始文档。
 * - id: UUID 主键
 * - user_id: 所属用户（来自 Java JWT 解析后的用户 id），做多用户隔离
 * - status: processing(处理中) / ready(就绪可检索) / failed(解析或向量化失败)
 * - chunk_count: 切片数，处理成功后回填
 */
export const documents = ai.table(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    // 原文件落盘的相对路径（相对 uploads 根目录），如 {userId}/{uuid}.{ext}
    filePath: text("file_path"),
    status: text("status").notNull().default("processing"),
    chunkCount: integer("chunk_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("documents_user_idx").on(t.userId)],
);

/**
 * 文档切片表：每个 chunk 的文本 + 向量。
 * - document_id 外键关联 documents，级联删除（删文档自动清切片）
 * - embedding: pgvector(1024)，上传时一次性向量化写入，查询只做检索不重复嵌入
 * - sequence: 切片在原文档中的顺序，用于引用溯源
 */
export const documentChunks = ai.table(
  "document_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    // 硅基流动 BAAI/bge-large-zh-v1.5 输出 1024 维
    embedding: vector("embedding", { dimensions: 1024 }),
    sequence: integer("sequence").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("document_chunks_doc_idx").on(t.documentId)],
);

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentChunk = typeof documentChunks.$inferSelect;
