import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/ai/http";
import { requireAuth } from "@/lib/ai/auth";
import {
  getDocumentById,
  getDocumentWithChunks,
} from "@/lib/ai/services/document-repo";
import { deleteDocumentWithChunks } from "@/lib/ai/document-processor";
import { deleteUploadedFile } from "@/lib/ai/file-storage";

export const runtime = "nodejs";

/**
 * 文档详情 + 删除。
 *
 * GET    /api/knowledge/documents/{id} — 详情 + 前 N 个 chunks 预览
 * DELETE /api/knowledge/documents/{id} — 级联删文档 + chunks
 */

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

const DetailQuerySchema = z.object({
  // chunks 预览条数
  preview: z.coerce.number().int().min(1).max(50).default(5),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.resp;

  const [parsedParams, parsedQuery] = await Promise.all([
    ParamsSchema.safeParse(await params),
    DetailQuerySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams),
    ),
  ]);
  if (!parsedParams.success) {
    return jsonError(422, "参数校验失败", 422);
  }

  try {
    const result = await getDocumentWithChunks(
      auth.user.userId,
      parsedParams.data.id,
      parsedQuery.success ? parsedQuery.data.preview : 5,
    );
    if (!result) return jsonError(404, "文档不存在或无权访问", 404);
    return jsonOk(result);
  } catch (e) {
    return jsonError(500, `服务异常：${(e as Error).message}`, 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(_req);
  if (!auth.ok) return auth.resp;

  const parsed = ParamsSchema.safeParse(await params);
  if (!parsed.success) {
    return jsonError(422, "参数校验失败", 422);
  }
  const { id } = parsed.data;

  try {
    // 一次查询同时做所有权校验 + 拿 filePath 用于清理磁盘
    const doc = await getDocumentById(auth.user.userId, id);
    if (!doc) return jsonError(404, "文档不存在或无权访问", 404);

    // 先删文件（幂等，不存在不报错），再删 DB 行（CASCADE 清 chunks）
    if (doc.filePath) await deleteUploadedFile(doc.filePath);
    await deleteDocumentWithChunks(id);
    return jsonOk(null);
  } catch (e) {
    return jsonError(500, `删除失败：${(e as Error).message}`, 500);
  }
}
