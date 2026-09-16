/**
 * AI 聊天流式接口的契约类型，与 apps/ai 后端的 ChatStreamEvent 对齐。
 *
 * 后端协议（apps/ai/src/lib/ai/http.ts 的 sseResponse）：
 *   data: {"conversationId":"...","delta":"..."}\n\n
 *   data: [DONE]\n\n
 *   data: {"error":"..."}\n\n
 */
export interface ChatStreamEvent {
  conversationId?: string;
  delta?: string;
  error?: string;
}
