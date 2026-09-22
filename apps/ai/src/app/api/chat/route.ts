import { parseJsonBody, jsonOk, jsonError } from "@/lib/ai/http";
import { requireAuth } from "@/lib/ai/auth";
import { ChatRequestSchema, chatService } from "@/lib/ai/services/chat-service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.resp;

  const r = await parseJsonBody(req, ChatRequestSchema);
  if (!r.ok) return r.resp;

  try {
    const data = await chatService.send(r.data, auth.user);
    return jsonOk(data);
  } catch (e) {
    return jsonError(500, `服务异常：${(e as Error).message}`, 500);
  }
}
