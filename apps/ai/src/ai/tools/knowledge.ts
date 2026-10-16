import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getRuntime } from "./util";
import { embeddings as embeddingModel } from "../../model/embedding";
import { DrizzleVectorStore } from "../../lib/ai/vector-store";
import { listReadyDocumentIds } from "../../lib/ai/services/document-repo";
import { db } from "../../lib/ai/db";
import { documents } from "../../lib/ai/schema";
import { inArray, eq, and } from "drizzle-orm";

const NO_AUTH = "未获取到用户身份，无法检索知识库。";

/**
 * 知识库检索工具：从当前用户上传的文档中检索语义相关片段。
 *
 * - 用户身份从 LangChain configurable.userId 取，做 user_id 隔离（防越权）
 * - documentIds 可选：限定在指定文档子集；不传则检索该用户所有 ready 文档
 * - 使用 DrizzleVectorStore.similaritySearchWithScore，top-k（默认 4），带 cosine 距离分
 * - 返回拼接片段 + 来源（文件名 + chunk 序号），供模型回答时引用
 */
export const knowledgeSearch = tool(
  async ({ query, documentIds }, config) => {
    const { userId } = getRuntime(config);
    if (!userId) return NO_AUTH;

    // 未指定 documentIds：查该用户全部 ready 文档 id
    let ids = documentIds;
    if (!ids || ids.length === 0) {
      ids = await listReadyDocumentIds(userId);
    }
    if (!ids.length) {
      return "当前用户尚未上传任何已就绪的文档，无法检索。";
    }

    // 检索
    const store = new DrizzleVectorStore(embeddingModel);
    const hits = await store.similaritySearchWithScore(query, 4, {
      documentIds: ids,
    });

    if (!hits.length) {
      return `未在知识库中找到与"${query}"相关的内容。`;
    }

    // 批量查文件名用于来源引用
    const docRows = await db
      .select({ id: documents.id, fileName: documents.fileName })
      .from(documents)
      .where(and(inArray(documents.id, ids), eq(documents.userId, userId)));
    const nameMap = new Map(docRows.map((r) => [r.id, r.fileName]));

    // 拼接返回给模型
    const parts = hits.map(([doc, score], i) => {
      const docId = doc.metadata?.documentId as string | undefined;
      const seq = doc.metadata?.sequence as number | undefined;
      const fileName = (docId && nameMap.get(docId)) || "未知文档";
      const src = seq !== undefined ? `${fileName}#${seq}` : fileName;
      return `【片段 ${i + 1}】来源: ${src}（相似度 ${(1 - score).toFixed(3)}）\n${doc.pageContent}`;
    });

    return parts.join("\n\n---\n\n");
  },
  {
    name: "knowledge_search",
    description:
      "从当前用户上传的知识库文档中检索语义相关片段。当用户询问的内容可能涉及已上传的文档（如售后政策、FAQ、产品手册等）时调用。仅检索当前用户的文档，不会查到其他用户的文档。",
    schema: z.object({
      query: z.string().describe("检索关键词或问题，用自然语言描述"),
      documentIds: z
        .array(z.string())
        .optional()
        .describe("限定检索的文档 ID 列表；不传则检索当前用户全部已就绪文档"),
    }),
  },
);
