import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/ai/http";
import { requireAuth } from "@/lib/ai/auth";
import { listConversations } from "@/lib/ai/services/conversation-repo";

export const runtime = "nodejs";

/** 查询参数：limit 可选，限制返回条数，默认 50 */
const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * 会话列表：给前端侧边栏展示。
 * 返回当前用户的会话（id / title / agentKey / 时间），按最近活跃倒序。
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.resp;

  const parsed = QuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return jsonError(422, "参数校验失败", 422);
  }

  try {
    const list = await listConversations(auth.user.userId, parsed.data.limit);
    return jsonOk(list);
  } catch (e) {
    return jsonError(500, `服务异常：${(e as Error).message}`, 500);
  }
}
