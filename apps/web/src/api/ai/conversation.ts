import { aiHttp } from "../http";

/** 会话列表项，与后端 listConversations 返回对齐 */
export interface ConversationItem {
  id: string;
  title: string;
  agentKey: string;
  createdAt: string;
  updatedAt: string;
}

/** 会话历史消息项，与后端 listMessagesForDisplay 返回对齐 */
export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

/** 拉取当前用户的会话列表（侧边/下拉用），按最近活跃倒序 */
export async function listConversations(limit = 50) {
  const res = await aiHttp.get<ConversationItem[]>("/conversation/list", {
    params: { limit },
  });
  return res.data;
}

/** 拉取某会话的全部历史消息（切换会话时恢复气泡用） */
export async function listConversationMessages(conversationId: string) {
  const res = await aiHttp.get<ConversationMessage[]>(
    "/conversation/messages",
    { params: { conversationId } },
  );
  return res.data;
}

/** 删除某会话（切换会话时删除当前会话） */
export async function deleteConversationById(id: string) {
  await aiHttp.delete(`/conversation/${id}`);
}
