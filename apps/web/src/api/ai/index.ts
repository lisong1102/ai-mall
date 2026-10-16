import { aiHttp } from "../http";

interface Health {
  status: string;
  service: string;
}

/** AI 服务健康检查 */
export async function getAiHealth() {
  const res = await aiHttp.get<Health>("/health");
  return res.data;
}

export {
  listConversations,
  listConversationMessages,
  type ConversationItem,
  type ConversationMessage,
} from "./conversation";

export {
  listDocuments,
  uploadDocument,
  getDocument,
  deleteDocument,
  downloadDocument,
  documentDownloadUrl,
  type KnowledgeDocument,
  type DocumentListResult,
  type DocumentDetail,
  type DocumentChunkPreview,
  type DocumentStatus,
  type ListDocumentsParams,
} from "./knowledge";
