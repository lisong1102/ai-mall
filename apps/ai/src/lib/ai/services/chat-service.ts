import { normalAgent } from "@/agents/normal";
import { deepseekModel } from "@/model";
import { z } from "zod";

/**
 * Chat 接口的请求 schema。
 * - message 必填，非空字符串
 * - conversationId 可选（首次对话无值，service 会自动建会话）
 *
 * 多传字段默认被 zod 静默丢弃；如需严格拒绝，加 `.strict()`。
 */
export const ChatRequestSchema = z.object({
  message: z.string().min(1, "消息不能为空"),
  conversationId: z.string().optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface ChatResponse {
  conversationId: string;
  reply: string;
}

/** 流式事件：每次只推一个增量 token，前端自己累加 */
export interface ChatStreamEvent {
  conversationId: string;
  delta: string;
}

/**
 * Chat 业务编排入口（route 层只调它）。
 *
 * TODO（接 LangGraph 时实现）：
 * 1. 加载 / 新建 conversation
 * 2. 拉短期记忆（历史 messages）
 * 3. 调 agents/chat-agent 的 compiled graph
 * 4. 持久化 user / assistant message 到 ai.message 表
 * 5. 返回 AI 回复
 */
export const chatService = {
  async send(input: ChatRequest): Promise<ChatResponse> {
    // 临时 mock，验证骨架连通；接 LangGraph 后替换
    const response = await deepseekModel.invoke([
      { role: "user", content: input.message },
    ]);
    return {
      conversationId: input.conversationId ?? "tmp-conv-1",
      reply: response.text,
    };
  },
  async *stream(
    input: ChatRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent> {
    const conversationId = input.conversationId ?? "tmp-conv-1";

    // streamMode: "messages" → 每个事件是 [AIMessageChunk, metadata]
    // 只取 agent 节点产出的文本增量；工具节点（tool）的产出不推给前端
    // signal 透传：前端断开时，LangChain 会中断到模型/工具的底层请求，不继续烧 token
    const stream = await normalAgent.stream(
      {
        messages: [{ role: "user", content: input.message }],
      },
      { streamMode: "messages", signal },
    );

    for await (const [chunk, metadata] of stream) {
      // langchain 1.x createAgent 的模型节点名是 model_request（不是旧版 agent）
      // 用消息类型 ai 判断比硬编码节点名更稳；工具结果消息（tool）不推给前端
      if (metadata?.langgraph_node !== "model_request") continue;
      if (chunk._getType?.() !== "ai") continue;
      const content = chunk.content;
      if (typeof content !== "string" || content.length === 0) continue;
      yield { conversationId, delta: content };
    }
  },
};
