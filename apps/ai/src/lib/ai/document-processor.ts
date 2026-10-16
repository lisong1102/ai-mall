import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { documentChunks, documents } from "./schema";
import { DrizzleVectorStore } from "./vector-store";
import { embeddings } from "../../model/embedding";

/**
 * 文档处理流水线：解析 → 切片 → 一次性向量化入库 → 回写状态。
 *
 * 同步处理（小文件够用）。TODO: 大文件场景后续演进为异步队列（如 BullMQ），
 * 上传接口先返回 processing，后台完成后置 ready。
 */

/** 支持的文件类型白名单：mime → 处理器类型 */
const SUPPORTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "text/plain",
] as const;

export function isSupportedFileType(
  mimeType: string,
  fileName: string,
): boolean {
  if ((SUPPORTED_TYPES as readonly string[]).includes(mimeType)) return true;
  // mime 可能为空或不准（浏览器/OS 差异），用扩展名兜底
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  return ["pdf", "docx", "md", "markdown", "txt"].includes(ext);
}

/**
 * 按文件类型解析为 LangChain Document 列表（统一中间表示，保留 loader 元数据如页码）。
 * 优先 List[Document] 而非纯文本：避免链路丢信息，后续 splitDocuments 会自动
 * 把输入 Document 的 metadata 合并到每个切分 chunk（如 PDF 的 page）。
 */
async function loadDocuments(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<Document[]> {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const mime = mimeType || extToMime(ext);

  if (mime === "application/pdf" || ext === "pdf") {
    const loader = new PDFLoader(toBlob(fileBuffer, mime));
    return loader.load();
  }

  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const loader = new DocxLoader(toBlob(fileBuffer, mime));
    return loader.load();
  }

  // md / txt：直接解码（TextLoader 同款逻辑，避免引入 @langchain/classic）
  return [new Document({ pageContent: fileBuffer.toString("utf-8") })];
}

function toBlob(buffer: Buffer, type: string): Blob {
  // Buffer → Uint8Array：规避 @types/node ArrayBufferLike 与 BlobPart 的类型不兼容
  return new Blob([new Uint8Array(buffer)], { type });
}

function extToMime(ext: string): string {
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "md":
    case "markdown":
      return "text/markdown";
    default:
      return "text/plain";
  }
}

export interface ProcessDocumentInput {
  documentId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
}

export interface ProcessDocumentResult {
  chunkCount: number;
}

/**
 * 处理上传文档：解析 → 切片 → 向量化入库 → status=ready。
 * 任一步骤失败：清理已写入的 chunks（防半成品）→ status=failed，不向上抛（由调用方读状态）。
 */
export async function processDocument(
  input: ProcessDocumentInput,
): Promise<ProcessDocumentResult> {
  const { documentId, fileBuffer, fileName, mimeType } = input;
  try {
    if (!isSupportedFileType(mimeType, fileName)) {
      throw new Error(`不支持的文件类型: ${mimeType || "未知"} (${fileName})`);
    }

    // 1. 解析为 Document 列表（保留 loader 元数据，如 PDF 页码）
    const docs = await loadDocuments(fileBuffer, mimeType, fileName);
    if (docs.length === 0 || docs.every((d) => !d.pageContent.trim())) {
      throw new Error("文档解析后无有效文本内容");
    }

    // 2. 切片：用 splitDocuments 而非 splitText，自动把源 Document 的 metadata（page 等）
    //    合并到每个 chunk。BGE 512 token 上限 → chunkSize 400 / overlap 50
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 400,
      chunkOverlap: 50,
    });
    const chunks = await splitter.splitDocuments(docs);

    // 3. 过滤空白 chunk + 补 documentId + 全局 sequence
    //    （splitDocuments 只透传源 metadata，不含我们的业务字段 documentId/sequence）
    const docsWithMeta: Document[] = [];
    for (const doc of chunks) {
      if (!doc.pageContent.trim()) continue;
      docsWithMeta.push(
        new Document({
          pageContent: doc.pageContent,
          metadata: {
            ...doc.metadata,
            documentId,
            sequence: docsWithMeta.length,
          },
        }),
      );
    }

    // 4. 一次性向量化入库（查询时不再重复嵌入）
    const store = new DrizzleVectorStore(embeddings);
    await store.addDocuments(docsWithMeta);

    // 5. 回写状态
    await db
      .update(documents)
      .set({
        status: "ready",
        chunkCount: docsWithMeta.length,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    return { chunkCount: docsWithMeta.length };
  } catch (err) {
    // 清理半成品 chunks（正常情况下 addDocuments 单条 insert 原子执行不会留半成品，
    // 但解析后部分写入的防御性清理成本低），再置 failed
    await db
      .delete(documentChunks)
      .where(eq(documentChunks.documentId, documentId));
    await db
      .update(documents)
      .set({
        status: "failed",
        updatedAt: new Date(),
        // 错误信息暂存 title 之外无字段，先打日志；后续可加 error 列
      })
      .where(eq(documents.id, documentId));
    console.error(`[document-processor] 文档处理失败 (${fileName}):`, err);
    return { chunkCount: 0 };
  }
}

/** 删除文档及其全部 chunks（CASCADE 由外键保证，这里显式删 chunks 防御孤儿数据） */
export async function deleteDocumentWithChunks(
  documentId: string,
): Promise<void> {
  await db
    .delete(documentChunks)
    .where(eq(documentChunks.documentId, documentId));
  await db.delete(documents).where(eq(documents.id, documentId));
}

/** 统计某文档 chunks 数（对账 chunk_count 用） */
export async function countChunks(documentId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documentChunks)
    .where(eq(documentChunks.documentId, documentId));
  return Number(row?.count ?? 0);
}
