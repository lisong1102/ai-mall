import { aiHttp } from "../http";

/** 文档状态，与后端 schema 对齐 */
export type DocumentStatus = "processing" | "ready" | "failed";

/** 知识库文档列表项 */
export interface KnowledgeDocument {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  mimeType: string;
  filePath: string | null;
  status: DocumentStatus;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 列表分页返回 */
export interface DocumentListResult {
  list: KnowledgeDocument[];
  total: number;
}

/** 详情接口的 chunks 预览项 */
export interface DocumentChunkPreview {
  id: string;
  content: string;
  sequence: number;
}

/** 文档详情 + chunks 预览 */
export interface DocumentDetail {
  document: KnowledgeDocument;
  chunks: DocumentChunkPreview[];
}

/** 列表查询参数 */
export interface ListDocumentsParams {
  page?: number;
  size?: number;
  status?: DocumentStatus;
}

/** 拉取当前用户的文档列表（分页 + 可选 status 过滤） */
export async function listDocuments(params: ListDocumentsParams = {}) {
  const res = await aiHttp.get<DocumentListResult>("/knowledge/documents", {
    params,
  });
  return res.data;
}

/** 上传文档（multipart，AI 服务同步处理：解析→切片→向量化→入库） */
export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await aiHttp.post<KnowledgeDocument>(
    "/knowledge/documents",
    formData,
  );
  return res.data;
}

/** 获取文档详情（含前 N 个 chunks 预览，默认 5） */
export async function getDocument(id: string, preview = 5) {
  const res = await aiHttp.get<DocumentDetail>(`/knowledge/documents/${id}`, {
    params: { preview },
  });
  return res.data;
}

/** 删除文档（级联删 chunks + 清理磁盘原文件） */
export async function deleteDocument(id: string) {
  await aiHttp.delete(`/knowledge/documents/${id}`);
}

/**
 * 构造文档原文件下载 URL（需带 Authorization 头访问）。
 * 前端通常用 <a href> 或 window.open 触发，但 JWT 鉴权下不能直接打开——
 * 建议用 fetch + blob 方式下载，或通过 API 层封装。
 */
export function documentDownloadUrl(id: string, download = false) {
  const base = `/knowledge/documents/${id}/download`;
  return download ? `${base}?download=1` : base;
}

/** 以带鉴权头的方式下载文档原文件（返回 blob，可用于预览或保存） */
export async function downloadDocument(
  id: string,
  download = false,
): Promise<Blob> {
  const url = documentDownloadUrl(id, download);
  const res = await aiHttp.get(url, { responseType: "blob" });
  return res.data as unknown as Blob;
}
