import { kimiModel } from "@/model";
import { createAgent, createMiddleware, ToolMessage } from "langchain";
import { initiateRefund, queryOrder } from "../tools";
import { interrupt } from "@langchain/langgraph";
import { mallServerFetch } from "@/lib/mall-server";
import { OrderVO, PageResult } from "@/type";
import {
  RefundApprovalDecision,
  RefundApprovalRequest,
} from "@/type/message-part";

// 中间件：拦截 initiate_refund 工具调用，金额超过阈值时挂起
const refundApprovalMiddleware = createMiddleware({
  name: "refund_approval",
  async wrapToolCall(request, next) {
    if (request.toolCall?.name !== "initiate_refund") return next(request);
    const APPROVAL_THRESHOLD = 500;
    // 服务端查单金额（模型给的金额不可信）
    const orderNo = (request.toolCall.args as { orderId: string }).orderId;
    const userToken = request.runtime?.configurable?.userToken as
      | string
      | undefined;
    let amount = 0;
    try {
      const data = await mallServerFetch<PageResult<OrderVO>>(
        `/orders?orderNo=${orderNo}&page=1&size=1`,
        undefined,
        userToken,
      );
      amount = Number(data?.records?.[0]?.totalAmount ?? 0);
    } catch {
      // 查不到金额 → 保守走人工审批（amount=0 会误放行，需改成查不到即审批）
      amount = APPROVAL_THRESHOLD + 1;
    }
    if (amount <= APPROVAL_THRESHOLD) return next(request);

    // 挂起：写 checkpoint；恢复执行时此调用直接返回决策
    const decision = interrupt<RefundApprovalRequest, RefundApprovalDecision>({
      reason: `退款金额 ${amount} 元超过 ${APPROVAL_THRESHOLD} 元，需要人工审批`,
      orderNo,
      amount,
    });

    if (!decision.approved) {
      return new ToolMessage({
        content: `退款申请被拒绝。原因：${decision.note ?? "未通过审核"}`,
        tool_call_id: request.toolCall.id ?? "",
        name: request.toolCall.name,
        status: "error",
      });
    }
    return next(request); // 同意 → 真正执行 initiate_refund
  },
});

export const refundAgent = createAgent({
  name: "refundAgent",
  model: kimiModel,
  tools: [queryOrder, initiateRefund],
  middleware: [refundApprovalMiddleware],
  checkpointer: true, // ★ 关键：继承父图 checkpointer，interrupt 才能挂起/恢复
  systemPrompt: `你是退款专员。流程：
1. 先用 query_order 确认订单存在且状态允许退款（已发货 / 已送达可退）
2. 调 initiate_refund 发起退款，金额以订单金额为准（除非用户明确要部分退款）
3. 退款成功后告知用户退款编号和预计到账时间。`,
});
