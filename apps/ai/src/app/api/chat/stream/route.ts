import { parseJsonBody, sseResponse } from "@/lib/ai/http";
import { ChatRequestSchema, chatService } from "@/lib/ai/services/chat-service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const r = await parseJsonBody(req, ChatRequestSchema);
  if (!r.ok) return r.resp;

  //模型调用流式响应
  const genResult = chatService.stream(r.data, req.signal);

  //处理模型返回流式响应，返回流式响应
  return sseResponse(genResult, {
    signal: req.signal,
  });
}
