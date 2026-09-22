import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/ai/http";
import {
  deleteConversation,
  getConversation,
} from "@/lib/ai/services/conversation-repo";

export const runtime = "nodejs";

/** 动态路由参数：id 必须是 UUID */
const ParamsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * 删除指定会话（含级联消息）。
 * DELETE /api/conversation/{id}
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = ParamsSchema.safeParse(await params);
  if (!parsed.success) {
    return jsonError(422, "参数校验失败", 422);
  }

  const { id } = parsed.data;
  try {
    const conv = await getConversation(id);
    if (!conv) return jsonError(404, "会话不存在", 404);

    // FK 配置了 onDelete: "cascade"，删 conversation 会自动删关联 messages
    await deleteConversation(id);
    return jsonOk(null);
  } catch (e) {
    return jsonError(500, `服务异常：${(e as Error).message}`, 500);
  }
}
