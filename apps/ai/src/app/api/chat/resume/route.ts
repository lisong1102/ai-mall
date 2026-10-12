import { z } from "zod";
import { parseJsonBody, sseResponse } from "@/lib/ai/http";
import { requireAuth } from "@/lib/ai/auth";
import { chatService } from "@/lib/ai/services/chat-service";

export const runtime = "nodejs";

const ResumeSchema = z.object({
  conversationId: z.string().uuid(),
  approved: z.boolean(),
  note: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.resp;

  const r = await parseJsonBody(req, ResumeSchema);
  if (!r.ok) return r.resp;

  return sseResponse(
    chatService.resume(
      r.data.conversationId,
      { approved: r.data.approved, note: r.data.note },
      auth.user,
      req.signal,
    ),
    { signal: req.signal },
  );
}
