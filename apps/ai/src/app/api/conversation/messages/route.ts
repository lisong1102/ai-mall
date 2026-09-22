import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/ai/http";
import {
  getConversation,
  listMessagesForDisplay,
} from "@/lib/ai/services/conversation-repo";

export const runtime = "nodejs";

/** 查询参数：conversationId 必填且为 UUID */
const QuerySchema = z.object({
  conversationId: z.string().uuid(),
});

/**
 * 某会话的历史消息：前端切换会话时恢复聊天气泡用。
 * 按时间升序返回 user / assistant 消息。
 */
export async function GET(req: Request) {
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return jsonError(422, "参数校验失败", 422);
  }

  const { conversationId } = parsed.data;
  try {
    const conv = await getConversation(conversationId);
    if (!conv) return jsonError(404, "会话不存在", 404);

    const list = await listMessagesForDisplay(conversationId);
    return jsonOk(list);
  } catch (e) {
    return jsonError(500, `服务异常：${(e as Error).message}`, 500);
  }
}
