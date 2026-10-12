/** 消息内容片段：一条消息 = parts 数组，存 ai.messages.content (jsonb) */
export type MessagePart =
  | { type: "text"; text: string }
  /** 审批请求卡片（interrupt value 透传） */
  | { type: "approval"; approval: RefundApprovalRequest }
  /** 自定义业务组件（前端注册表按 name 渲染） */
  | { type: "component"; name: string; props: Record<string, unknown> };

/** 审批请求（中间件 interrupt 的 payload，SSE approval 帧与前端卡片共用） */
export interface RefundApprovalRequest {
  reason: string;
  orderNo: string;
  amount: number;
}

/** 审批决策（resume 请求体 = Command resume payload） */
export interface RefundApprovalDecision {
  approved: boolean;
  note?: string;
}

/** meta.approval 状态机：pending → resolved（resolved 时补充 approved/note） */
export interface ApprovalMeta extends RefundApprovalRequest {
  status: "pending" | "resolved";
  approved?: boolean;
  note?: string | null;
}

/** 提取纯文本（非流式 reply / 预览 / 喂模型降级用） */
export function textContentOf(parts: MessagePart[]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/** SSE 流事件协议（http.ts sseResponse 逐帧 JSON 序列化） */
export type ChatStreamEvent =
  | { type: "delta"; conversationId: string; delta: string }
  | {
      type: "component";
      conversationId: string;
      name: string;
      props: Record<string, unknown>;
    }
  | {
      type: "approval";
      conversationId: string;
      approval: RefundApprovalRequest;
    }
  | { type: "error"; conversationId: string; error: string };
