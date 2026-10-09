import { z } from "zod";
import { DEFAULT_AGENT_KEY, type AgentKey } from "@/ai/agents";
import { graph } from "@/ai/index";
import {
  createConversation,
  getConversation,
  insertMessage,
  updateTitle,
} from "./conversation-repo";
import analysisChain from "@/ai/agents/conversationAgent";

/**
 * Chat 接口的请求 schema。
 * - message 必填，非空字符串
 * - conversationId 可选（首次对话无值，service 自动建会话）
 * - agentKey 可选，仅新建会话时生效；已有 conversation 以库中 agent_key 为准
 *   扩展新 agent 时：agents/index.ts 登记 + 此处 enum 加值
 *
 * 多传字段默认被 zod 静默丢弃；如需严格拒绝，加 `.strict()`。
 */
export const ChatRequestSchema = z.object({
  message: z.string().min(1, "消息不能为空"),
  conversationId: z.string().uuid().optional(),
  agentKey: z.enum(["normal"]).optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/** 调用方（route 层）解析 JWT 后传入的用户身份 */
export interface ChatUser {
  userId: string;
  username: string;
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
}

/** 流式事件：保持 `{conversationId, delta}` 协议与前端 use-chat-stream 对齐 */
export interface ChatStreamEvent {
  conversationId: string;
  delta: string;
}

/** 首条 user 消息截 N 字作 conversation.title */
const TITLE_LIMIT = 30;

/**
 * Chat 业务编排入口（route 层只调它）。
 *
 * 流程：
 * 1. 解析 / 新建 conversation（带 agent_key 绑定）
 * 2. 拉短期记忆（历史 messages）
 * 3. 存 user message（先进库，避免丢）
 * 4. 调对应 agent 的 compiled graph（LangChain createAgent）
 * 5. 流式累加 delta：yield 给前端 + 拼到 assistantBuffer
 * 6. 正常结束：存 assistant message + 首条消息更新 title
 *    abort / 异常：不落库 assistant（前端已显示 ⚠️，不污染历史）
 *
 * userId 由 route 层从 JWT 解析后传入。
 */
export const chatService = {
  async send(input: ChatRequest, user: ChatUser): Promise<ChatResponse> {
    // 非流式：复用 stream 累加，避免编排逻辑重复
    let reply = "";
    let conversationId = "";
    for await (const ev of this.stream(input, user)) {
      conversationId = ev.conversationId;
      reply += ev.delta;
    }
    return { conversationId, reply };
  },

  async *stream(
    input: ChatRequest,
    user: ChatUser,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent> {
    // ── 1. 解析 / 新建 conversation ───────────────────────
    // 会话id
    let conversationId: string;
    // agent模型key
    let agentKey: AgentKey;
    // 是否新会话
    let isNew = false;
    // 会话标题
    let title: string;

    if (input.conversationId) {
      const conv = await getConversation(input.conversationId);
      if (!conv) throw new Error("会话不存在");
      conversationId = conv.id;
      agentKey = conv.agentKey as AgentKey;
      title = conv.title;
    } else {
      const key = (input.agentKey ?? DEFAULT_AGENT_KEY) as AgentKey;
      // 会话标题：总结会话内容
      const result = await analysisChain.invoke({ input: input.message });
      title = result.reply;
      const conv = await createConversation(user.userId, key, title);
      conversationId = conv.id;
      agentKey = key;
      isNew = true;
    }

    const agent = graph;

    // ── 3. 存 user message（先落库，避免丢）───────────────
    await insertMessage(conversationId, "user", input.message);

    // ── 4. 启动 agent 流 ──────────────────────────────────
    // streamMode: "messages" → 每个事件是 [AIMessageChunk, metadata]
    // signal 透传：前端断开时，LangChain 会中断到模型/工具的底层请求，不继续烧 token
    const stream = await agent.stream(
      {
        messages: [{ role: "user", content: input.message }],
      },
      {
        streamMode: "messages",
        signal,
        configurable: { thread_id: conversationId },
      },
    );

    // ── 5. 累加 + yield delta ─────────────────────────────
    // langchain 1.x createAgent 的模型节点名是 model_request（不是旧版 agent）
    // 用消息类型 ai 判断比硬编码节点名更稳；工具结果消息（tool）不推给前端
    let assistantBuffer = "";
    for await (const [chunk, metadata] of stream) {
      if (metadata?.langgraph_node !== "model_request") continue;
      if (chunk._getType?.() !== "ai") continue;
      const content = chunk.content;
      if (typeof content !== "string" || content.length === 0) continue;
      assistantBuffer += content;
      yield { conversationId, delta: content };
    }

    // ── 6. 正常结束：存 assistant + 首条消息更新 title ─────
    // abort / 异常会从上面 for await 抛出，跳过这里 → assistant 不落库
    if (assistantBuffer.length === 0) {
      throw new Error("AI 未返回内容");
    }
    await insertMessage(conversationId, "assistant", assistantBuffer);
    if (isNew && title === "新对话") {
      await updateTitle(conversationId, input.message.slice(0, TITLE_LIMIT));
    }
  },
};
