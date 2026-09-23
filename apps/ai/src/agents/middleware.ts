import { summarizationMiddleware } from "langchain";
import { deepseekModel } from "@/model";

/**
 * 对话记忆压缩中间件：防止 checkpoint 里的 messages 无限增长。
 *
 * 机制（由 langchain summarizationMiddleware 自动处理）：
 * - 当 state 中消息数 ≥ trigger.messages 时触发压缩
 * - 把最近 keep.messages 条之外的旧消息总结成一条 summary
 * - summary 替换旧消息写入 state，新 checkpoint 存压缩后的 state
 * - 旧 checkpoint 行不变（仍存当时的完整 messages）
 *
 * 与 ai.message 表（前端展示用完整历史）完全独立，互不影响。
 */
export const summarization = summarizationMiddleware({
  model: deepseekModel,
  trigger: { messages: 20 },
  keep: { messages: 10 },
});
