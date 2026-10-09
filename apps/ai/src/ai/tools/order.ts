// src/tools/orders.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// 模拟订单数据库
const ORDERS = new Map([
  [
    "O-1001",
    { status: "shipped", carrier: "顺丰", trackingNo: "SF1234", amount: 299 },
  ],
  [
    "O-1002",
    {
      status: "delivered",
      carrier: "京东",
      trackingNo: "JD5678",
      amount: 1599,
    },
  ],
  ["O-1003", { status: "pending_payment", amount: 89 }],
]);

export const queryOrder = tool(
  async ({ orderId }) => {
    const order = ORDERS.get(orderId);
    if (!order) return `订单 ${orderId} 不存在`;
    return JSON.stringify({ orderId, ...order });
  },
  {
    name: "query_order",
    description:
      "根据订单号查询订单状态、物流、金额。订单号格式为 O- 开头的字符串。",
    schema: z.object({
      orderId: z.string().describe("订单号，如 O-1001"),
    }),
  },
);
