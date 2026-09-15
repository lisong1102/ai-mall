import { parseJsonBody, jsonOk, jsonError } from "@/lib/ai/http";
import { ChatRequestSchema, chatService } from "@/lib/ai/services/chat-service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const r = await parseJsonBody(req, ChatRequestSchema);
  if (!r.ok) return r.resp;

  try {
    const data = await chatService.send(r.data);
    return jsonOk(data);
  } catch (e) {
    return jsonError(500, `服务异常：${(e as Error).message}`, 500);
  }
}
