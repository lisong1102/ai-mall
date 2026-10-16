import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/ai/db";
import { documents, documentChunks } from "@/lib/ai/schema";

/**
 * 知识库 documents 的 DB 查询层。
 * 所有查询强制带 user_id，保证多用户隔离。
 */

export interface DocumentListParams {
  userId: string;
  page?: number;
  size?: number;
  status?: string;
}

export interface DocumentListResult {
  list: (typeof documents.$inferSelect)[];
  total: number;
}

/** 文档列表：user 隔离 + 可选 status 过滤 + 分页，按创建时间倒序 */
export async function listDocuments(
  params: DocumentListParams,
): Promise<DocumentListResult> {
  const page = params.page ?? 1;
  const size = Math.min(params.size ?? 20, 100);
  const offset = (page - 1) * size;

  const conditions = [eq(documents.userId, params.userId)];
  if (params.status) conditions.push(eq(documents.status, params.status));

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(and(...conditions));

  const list = await db
    .select()
    .from(documents)
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt))
    .limit(size)
    .offset(offset);

  return { list, total: Number(totalRow?.count ?? 0) };
}

/** 创建文档记录（status=processing），返回含 id 的行 */
export async function createDocument(input: {
  userId: string;
  title: string;
  fileName: string;
  mimeType: string;
  filePath?: string | null;
}) {
  const [row] = await db
    .insert(documents)
    .values({
      userId: input.userId,
      title: input.title,
      fileName: input.fileName,
      mimeType: input.mimeType,
      filePath: input.filePath ?? null,
    })
    .returning();
  return row;
}

/** 取某用户的单个文档（不存在返回 null）。user_id 校验防越权。 */
export async function getDocumentById(
  userId: string,
  id: string,
): Promise<typeof documents.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));
  return row ?? null;
}

/** 文档详情 + 前 N 个 chunks 预览（content 截断，不返回向量） */
export async function getDocumentWithChunks(
  userId: string,
  id: string,
  previewCount = 5,
): Promise<{
  document: typeof documents.$inferSelect;
  chunks: { id: string; content: string; sequence: number }[];
} | null> {
  const doc = await getDocumentById(userId, id);
  if (!doc) return null;

  const chunks = await db
    .select({
      id: documentChunks.id,
      content: documentChunks.content,
      sequence: documentChunks.sequence,
    })
    .from(documentChunks)
    .where(eq(documentChunks.documentId, id))
    .orderBy(documentChunks.sequence)
    .limit(previewCount);

  return { document: doc, chunks };
}

/** 列出某用户所有 ready 文档的 id（供 agent 工具做检索范围隔离） */
export async function listReadyDocumentIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.userId, userId), eq(documents.status, "ready")));
  return rows.map((r) => r.id);
}
