import { kimiModel } from "@/model";
import { createAgent, createMiddleware, ToolMessage } from "langchain";
import { initiateRefund, queryOrder } from "../tools";
import { interrupt } from "@langchain/langgraph";

// 中间件：拦截 initiate_refund 工具调用，金额超过阈值时挂起
const refundApprovalMiddleware = createMiddleware({
  name: "refund_approval",
  async wrapToolCall(request, next) {
    if (request.toolCall?.name !== "initiate_refund") return next(request);
    const amount = (request.toolCall?.args as { amount: number }).amount;
    if (amount <= 500) return next(request);

    // 触发 typed interrupt，挂起等人工审批
    // const decision = interrupt<
    //   {
    //     reason: string;
    //     orderId: string;
    //     amount: number;
    //   },
    //   {
    //     approved: boolean;
    //     note?: string;
    //   }
    // >({
    //   reason: "退款金额超过 500 元，需要人工审批",
    //   orderId: (request.toolCall?.args as { orderId: string }).orderId,
    //   amount,
    // });

    // 恢复执行后从 decision 拿到审批结果
    // const { approved, note } = decision;
    // if (!approved) {
    //   return new ToolMessage({
    //     content: `退款申请被拒绝。原因：${note ?? "未通过审核"}`,
    //     tool_call_id: request.toolCall.id ?? "",
    //     name: request.toolCall.name,
    //     status: "error",
    //   });
    // }
    return next(request);
  },
});

export const refundAgent = createAgent({
  name: "refundAgent",
  model: kimiModel,
  tools: [queryOrder, initiateRefund],
  middleware: [refundApprovalMiddleware],
  systemPrompt: `你是退款专员。流程：
1. 先用 query_order 确认订单存在且状态允许退款（已发货 / 已送达可退）
2. 调 initiate_refund 发起退款，金额以订单金额为准（除非用户明确要部分退款）
3. 退款成功后告知用户退款编号和预计到账时间。`,
});
