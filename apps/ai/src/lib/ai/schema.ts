import { pgSchema, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

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
 */
export const conversations = ai.table(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull().default("新对话"),
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
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("messages_conv_idx").on(t.conversationId)],
);

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
