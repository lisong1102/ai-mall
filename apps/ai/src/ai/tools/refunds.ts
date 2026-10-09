// src/tools/refunds.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const initiateRefund = tool(
  async ({ orderId, amount, reason }) => {
    // 真实场景调支付网关 API；这里返回模拟结果
    const refundId = `R-${Date.now()}`;
    return JSON.stringify({
      refundId,
      orderId,
      amount,
      reason,
      status: "processing",
      estimatedDays: 3,
    });
  },
  {
    name: "initiate_refund",
    description:
      "对一个订单发起退款。调用前必须已经通过 query_order 确认订单存在且状态允许退款。",
    schema: z.object({
      orderId: z.string().describe("订单号"),
      amount: z.number().positive().describe("退款金额（元）"),
      reason: z.string().describe("退款原因，用户描述"),
    }),
  },
);
