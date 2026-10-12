import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/ai/db";
import { conversations, messages } from "@/lib/ai/schema";
import type { AgentKey } from "@/ai/agents";
import {
  MessagePart,
  RefundApprovalDecision,
  textContentOf,
} from "@/type/message-part";

/**
 * Conversation + Message 的 DB CRUD。
 *
 * 约定：
 * - role 只存 user / assistant（system prompt 动态注入不入库）
 * - 历史消息按 created_at 升序读取，取最近 N 条做短期记忆
 * - 首条 user message 截 30 字作 conversation.title
 */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** 新建会话，绑定 agent_key（之后不变） */
export async function createConversation(
  userId: string,
  agentKey: AgentKey,
  title = "新对话",
) {
  const [row] = await db
    .insert(conversations)
    .values({ userId, agentKey, title })
    .returning();
  return row;
}

/** 列出某用户的会话（侧边栏用），按最近活跃（updated_at）倒序 */
export async function listConversations(userId: string, limit = 50) {
  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      agentKey: conversations.agentKey,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);
}

/** 取会话（含 agent_key）；不存在返回 null */
export async function getConversation(id: string) {
  const [row] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * 拉历史消息作短期记忆。
 * - 按 created_at 升序返回（喂给模型时按时间先后）
 * - 取最近 limit 条，控制 token 用量；默认 20 条
 */
export async function listMessages(
  conversationId: string,
  limit = 20,
): Promise<ChatTurn[]> {
  const rows = await db
    .select({
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  // 取的是"最近 N 条"，但升序喂给模型：反转
  return rows.reverse().map((r) => ({
    role: r.role as "user" | "assistant",
    content: textContentOf(r.content as MessagePart[]),
  }));
}

/**
 * 拉会话全部消息做前端展示/恢复。
 * - 按 created_at 升序返回（含 id / 时间），不做条数截断
 * - 区别于 listMessages（喂模型用：取最近 N 条、只留 role/content）
 */
export async function listMessagesForDisplay(conversationId: string) {
  return db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      meta: messages.meta,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

/** 落库一条消息，返回完整行（含 id / createdAt） */
export async function insertMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: MessagePart[],
  meta?: Record<string, unknown>,
) {
  const [row] = await db
    .insert(messages)
    .values({ conversationId, role, content, meta })
    .returning();
  return row;
}

/** 删除某会话（切换会话时删除当前会话） */
export async function deleteConversation(id: string) {
  await db.delete(conversations).where(eq(conversations.id, id));
}

/** 首条用户消息截 N 字作标题；同时刷新 updatedAt */
export async function updateTitle(id: string, title: string) {
  await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversations.id, id));
}

/**
 * 审批状态翻转：该会话 meta.approval.status = pending 的最新一条 → resolved。
 * 返回 false 表示没有 pending 行（已被处理）→ 作为幂等闩使用。
 */
export async function resolveApprovalMeta(
  conversationId: string,
  decision: RefundApprovalDecision,
): Promise<boolean> {
  const [row] = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        sql`${messages.meta}->'approval'->>'status' = 'pending'`,
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(1);
  if (!row) return false;

  const prev = (row.meta ?? {}) as { approval?: Record<string, unknown> };
  const meta = {
    ...prev,
    approval: {
      ...prev.approval,
      status: "resolved",
      approved: decision.approved,
      note: decision.note ?? null,
    },
  };
  await db.update(messages).set({ meta }).where(eq(messages.id, row.id));
  return true;
}
