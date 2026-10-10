// src/tools/refunds.ts
import { mallServerFetch } from "@/lib/mall-server";
import { ORDER_STATUS, OrderVO, PageResult } from "@/type";
import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getRuntime } from "./util";

export const initiateRefund = tool(
  async ({ orderId, reason, type }, config?: RunnableConfig) => {
    const { userToken } = getRuntime(config);
    if (!userToken) return "未获取到用户身份，无法查询订单。";
    // 查询当前订单状态，确认是否允许退款
    const params = new URLSearchParams({
      orderNo: orderId,
      page: "1",
      size: "20",
    });

    const data = await mallServerFetch<PageResult<OrderVO>>(
      `/orders?${params.toString()}`,
      undefined,
      userToken,
    );

    if (!data?.records?.[0]) {
      return `orderId ${orderId}订单不存在`;
    }

    const order = data.records[0];
    if (order.status !== 3) {
      return "当前订单没有已完成，不能退款";
    }

    // 发起退款
    await mallServerFetch<string>(
      `/after-sales`,
      {
        method: "POST",
        body: JSON.stringify({
          orderId: order.id,
          customerId: order.customerId,
          reason,
          type,
        }),
      },
      config?.configurable?.userToken,
    );
    return `orderId ${orderId}退款申请已提交，订单已置为退款中，等待商家审核通过后退款`;
  },
  {
    name: "initiate_refund",
    description:
      "对一个订单发起退款。调用前必须已经通过 query_order 确认订单存在且状态允许退款。",
    schema: z.object({
      orderId: z.string().describe("订单号"),
      reason: z.string().describe("退款原因，用户描述"),
      type: z.number().describe("退款类型，1仅退款，2：退货退款"),
    }),
  },
);
