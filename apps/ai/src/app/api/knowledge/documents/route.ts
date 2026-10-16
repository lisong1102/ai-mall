import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/ai/http";
import { requireAuth } from "@/lib/ai/auth";
import {
  createDocument,
  getDocumentById,
  listDocuments,
} from "@/lib/ai/services/document-repo";
import {
  isSupportedFileType,
  processDocument,
} from "@/lib/ai/document-processor";
import { saveUploadedFile } from "@/lib/ai/file-storage";

export const runtime = "nodejs";

/**
 * 知识库文档列表 + 上传。
 *
 * POST /api/knowledge/documents — multipart 上传 file
 * GET  /api/knowledge/documents — 列表（当前用户）
 */

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.resp;

  const parsed = ListQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return jsonError(422, "参数校验失败", 422);
  }

  try {
    const result = await listDocuments({
      userId: auth.user.userId,
      ...parsed.data,
    });
    return jsonOk(result);
  } catch (e) {
    return jsonError(500, `服务异常：${(e as Error).message}`, 500);
  }
}

/**
 * 上传文档：multipart/form-data 取 file → 校验类型 → 建 document(processing)
 * → 同步处理 → 返回 document。失败时 document.status 会被 processDocument 置 failed。
 *
 * 文件大小上限由 Next body parser 默认控制（默认 1MB；大文件后续改 streaming + 异步队列）。
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.resp;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError(422, "需要 multipart/form-data 请求", 422);
  }
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return jsonError(422, "缺少 file 字段", 422);
  }

  const fileName = file.name;
  const mimeType = file.type;

  if (!isSupportedFileType(mimeType, fileName)) {
    return jsonError(415, `不支持的文件类型: ${mimeType || "未知"}`, 415);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // 原文件先落盘，再建 document 记录（filePath 指向磁盘文件）
    const filePath = await saveUploadedFile(buffer, auth.user.userId, fileName);

    const doc = await createDocument({
      userId: auth.user.userId,
      title: fileName,
      fileName,
      mimeType,
      filePath,
    });

    // 同步处理（小文件）；processDocument 内部失败会置 failed 不向上抛
    await processDocument({
      documentId: doc.id,
      fileBuffer: buffer,
      fileName,
      mimeType,
    });

    // 重新查一次，拿到最新 status / chunk_count
    const latest = await getDocumentById(auth.user.userId, doc.id);
    return jsonOk(latest ?? doc);
  } catch (e) {
    return jsonError(500, `上传失败：${(e as Error).message}`, 500);
  }
}
