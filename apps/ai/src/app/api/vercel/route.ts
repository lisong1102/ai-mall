import { weatherAgent } from "@/ai/vercel/weather-agent";
import { parseJsonBody } from "@/lib/ai/http";
import { ChatRequestSchema, chatService } from "@/lib/ai/services/chat-service";
import { ModelMessage } from "ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const r = await parseJsonBody(req, ChatRequestSchema);
  if (!r.ok) return r.resp;

  const params = r.data;
  const messages = [
    {
      role: "user",
      content: params.message,
    },
  ] as ModelMessage[];

  //处理模型返回流式响应，返回流式响应
  const result = await weatherAgent.stream({
    messages,
  });
  return result.toUIMessageStreamResponse();
}
