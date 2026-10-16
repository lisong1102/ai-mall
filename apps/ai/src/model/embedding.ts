import { OpenAIEmbeddings } from "@langchain/openai";

/**
 * 知识库 Embedding 模型实例（用于文档切片向量化 + 检索查询向量化）。
 *
 * 选型：硅基流动聚合的 BAAI/bge-large-zh-v1.5（1024 维）
 * - OpenAI 兼容协议，复用 @langchain/openai，零新增依赖
 * - 国内直连，无需代理（生产单 VPS docker-compose 友好）
 * - 中文检索 SOTA，契合知识库中文文档场景
 *
 * 维度：1024 —— 与 schema.ts 的 document_chunks.embedding vector(1024) 对齐，
 *       切勿在此处启用 dimensions 降维参数（BGE 原生 1024，降维会破坏检索质量）。
 * 迁移注意：若后续更换为不同维度的模型（如 BGE-M3 是 1024 维/通义 v3 可选），
 *          必须同步改 schema 的 vector(N) 并重灌全部 chunks。
 */
export const embeddings = new OpenAIEmbeddings({
  model: "BAAI/bge-large-zh-v1.5",
  configuration: {
    baseURL: "https://api.siliconflow.cn/v1",
    apiKey: process.env.SILICONFLOW_API_KEY,
  },
});
