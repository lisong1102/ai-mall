import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { z } from "zod";
import { jsonError } from "@/lib/ai/http";
import { requireAuth } from "@/lib/ai/auth";
import { getDocumentById } from "@/lib/ai/services/document-repo";
import { resolveUploadPath } from "@/lib/ai/file-storage";

export const runtime = "nodejs";

/**
 * 下载 / 预览文档原文件。
 * GET /api/knowledge/documents/{id}/download
 *   - 默认 inline（浏览器预览，如 pdf 直接打开）
 *   - ?download=1 → attachment（强制下载）
 *
 * 鉴权：只有文档所有者可访问。
 */

const ParamsSchema = z.object({ id: z.string().uuid() });

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.resp;

  const parsed = ParamsSchema.safeParse(await params);
  if (!parsed.success) {
    return jsonError(422, "参数校验失败", 422);
  }
  const { id } = parsed.data;

  const doc = await getDocumentById(auth.user.userId, id);
  if (!doc) return jsonError(404, "文档不存在或无权访问", 404);
  if (!doc.filePath) return jsonError(404, "文件不存在", 404);

  let absPath: string;
  try {
    absPath = resolveUploadPath(doc.filePath);
  } catch {
    return jsonError(404, "文件路径非法", 404);
  }

  // 确认文件存在并拿 size
  let fileSize: number;
  try {
    const s = await stat(absPath);
    fileSize = s.size;
  } catch {
    return jsonError(404, "文件不存在", 404);
  }

  const url = new URL(req.url);
  const forceDownload = url.searchParams.get("download") === "1";
  // 中文文件名需要编码，否则部分浏览器乱码
  const encodedName = encodeURIComponent(doc.fileName);
  const disposition = forceDownload
    ? `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`
    : `inline; filename="${encodedName}"; filename*=UTF-8''${encodedName}`;

  const stream = createReadStream(absPath);

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Length": String(fileSize),
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
