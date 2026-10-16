import { Document } from "@langchain/core/documents";
import type { Embeddings } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { and, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "./db";
import { documentChunks } from "./schema";

/**
 * 检索过滤条件。
 * - documentIds：限定在指定文档子集内检索；不传则检索全部（user 隔离由上层调用前过滤）
 */
export interface DrizzleVectorStoreFilter {
  documentIds?: string[];
}

/**
 * 写入时每个 Document.metadata 必须携带的字段。
 * - documentId：外键到 documents.id（必填）
 * - sequence：切片顺序（可选，默认用数组索引）
 */
export interface DrizzleVectorStoreMetadata {
  documentId: string;
  sequence?: number;
}

/**
 * 基于 Drizzle + pgvector 的 LangChain VectorStore 实现。
 *
 * 设计要点：
 * - 复用项目 Drizzle 连接（db 实例，ai schema），不引入独立向量库
 * - 写入：document_chunks 表，embedding 列 vector(1024)
 * - 检索：pgvector cosine 距离算子 `<=>`（越小越相似），支持 document_id 过滤
 * - 向量化时机：addDocuments 内部调 embeddings.embedDocuments，查询时只 embedQuery 一次
 *
 * 使用示例（见 document-processor 与 knowledgeSearch 工具）：
 *   const store = new DrizzleVectorStore(embeddings);
 *   await store.addDocuments(chunks);  // chunks[i].metadata.documentId 必填
 *   const hits = await store.similaritySearchWithScore(query, 4, { documentIds });
 */
export class DrizzleVectorStore extends VectorStore {
  // LangChain VectorStore 的 Filter 类型占位，供 similaritySearch* 的 filter 参数类型推断
  declare FilterType: DrizzleVectorStoreFilter;

  // 实例级默认 filter（可选），检索时与传入 filter 取并集逻辑由调用方决定
  filter: DrizzleVectorStoreFilter | undefined;

  constructor(
    embeddings: Embeddings,
    config?: { filter?: DrizzleVectorStoreFilter },
  ) {
    // VectorStore 基类要求 dbConfig（Record<string, any>），此实现不使用基类 db 字段，
    // 实际数据访问走模块级 db 实例，便于复用项目 Drizzle 连接
    super(embeddings, {});
    this.filter = config?.filter;
  }

  _vectorstoreType(): string {
    return "drizzle";
  }

  /**
   * 写入向量 + 文档切片。
   * 每个 doc.metadata.documentId 必填（外键约束），缺失抛错而非静默写入孤儿数据。
   */
  async addVectors(
    vectors: number[][],
    documents: Document[],
  ): Promise<string[]> {
    if (vectors.length !== documents.length) {
      throw new Error("vectors 与 documents 数量不一致");
    }
    if (documents.length === 0) return [];

    const rows = documents.map((doc, i) => {
      const meta = doc.metadata as Partial<DrizzleVectorStoreMetadata>;
      if (!meta.documentId) {
        throw new Error(`Document[${i}] 缺少 metadata.documentId（外键必需）`);
      }
      return {
        documentId: meta.documentId,
        content: doc.pageContent,
        embedding: vectors[i],
        sequence: meta.sequence ?? i,
      };
    });

    const inserted = await db
      .insert(documentChunks)
      .values(rows)
      .returning({ id: documentChunks.id });
    return inserted.map((r) => r.id);
  }

  /**
   * 写入文档切片（内部先 embedDocuments 再 addVectors）。
   * 向量化时机：上传时一次性调用本方法，查询时不再重复嵌入。
   */
  async addDocuments(documents: Document[]): Promise<void> {
    if (documents.length === 0) return;
    const texts = documents.map((d) => d.pageContent);
    const vectors = await this.embeddings.embedDocuments(texts);
    await this.addVectors(vectors, documents);
  }

  /**
   * 检索：cosine 距离 + document_id 过滤，返回 top-k [Document, distance]。
   * distance 越小越相似（cosine 距离 0 表示完全一致）。
   * 传入 filter 优先于实例 filter；两者均无则检索全表（需由上层保证 user 隔离）。
   */
  async similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: DrizzleVectorStoreFilter,
  ): Promise<[Document, number][]> {
    const effectiveFilter = filter ?? this.filter;
    const documentIds = effectiveFilter?.documentIds;

    // pgvector 字面量：'[0.1,0.2,...]'，用 ::vector 显式转型
    const queryVec = `[${query.join(",")}]`;
    const distanceExpr = sql<number>`(${documentChunks.embedding} <=> ${queryVec}::vector)`;

    const conditions = [
      isNotNull(documentChunks.embedding),
      ...(documentIds && documentIds.length > 0
        ? [inArray(documentChunks.documentId, documentIds)]
        : []),
    ];

    const rows = await db
      .select({
        id: documentChunks.id,
        content: documentChunks.content,
        documentId: documentChunks.documentId,
        sequence: documentChunks.sequence,
        distance: distanceExpr.as("distance"),
      })
      .from(documentChunks)
      .where(and(...conditions))
      .orderBy(distanceExpr)
      .limit(k);

    return rows.map((row) => [
      new Document({
        pageContent: row.content,
        metadata: {
          documentId: row.documentId,
          sequence: row.sequence,
          chunkId: row.id,
        },
      }),
      Number(row.distance),
    ]);
  }

  /**
   * 工厂方法：从文本数组直接构造（每个文本需带 documentId 元数据）。
   * 便于 document-processor 在切片后一次性入库。
   */
  static async fromTexts(
    texts: string[],
    metadatas: DrizzleVectorStoreMetadata[],
    embeddings: Embeddings,
  ): Promise<DrizzleVectorStore> {
    const docs = texts.map(
      (t, i) =>
        new Document({
          pageContent: t,
          metadata: metadatas[i] ?? {},
        }),
    );
    const store = new DrizzleVectorStore(embeddings);
    await store.addDocuments(docs);
    return store;
  }
}
