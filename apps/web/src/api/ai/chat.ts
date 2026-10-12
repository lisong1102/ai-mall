/** 与后端 apps/ai/src/type/message-part.ts 对齐 */
export interface RefundApprovalRequest {
  reason: string;
  orderNo: string;
  amount: number;
}
export interface RefundApprovalDecision {
  approved: boolean;
  note?: string;
}
export type ApprovalStatus = "pending" | "resolved";
/** 前端渲染用的审批态（后端发请求字段，status 由 meta/本地补充） */
export interface ApprovalMeta extends RefundApprovalRequest {
  status: ApprovalStatus;
  approved?: boolean;
  note?: string | null;
}

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "approval"; approval: ApprovalMeta }
  | { type: "component"; name: string; props: Record<string, unknown> };

/** SSE 事件帧（http.ts sseResponse 异常帧 {error} 无 type，需兼容） */
export interface ChatStreamEvent {
  type?: "delta" | "component" | "approval" | "error";
  conversationId?: string;
  delta?: string;
  name?: string;
  props?: Record<string, unknown>;
  approval?: RefundApprovalRequest;
  error?: string;
}
