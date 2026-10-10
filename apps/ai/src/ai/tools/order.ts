// src/ai/tools/order.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { RunnableConfig } from "@langchain/core/runnables";
import { mallServerFetch } from "@/lib/mall-server";
import { ORDER_STATUS, OrderVO, PageResult } from "@/type";
import { getRuntime } from "./util";

const NO_AUTH = "未获取到用户身份，无法查询订单。";

/** 公共：组装订单摘要（供两个工具复用） */
function summarize(orders: OrderVO[]) {
  return orders.map((o) => ({
    orderNo: o.orderNo,
    customerName: o.customerName ?? "未知",
    totalAmount: o.totalAmount,
    status: o.status,
    statusText: ORDER_STATUS[o.status] ?? "未知",
    remark: o.remark ?? "",
    createdAt: o.createdAt,
    items: (o.items ?? []).map((it) => ({
      productName: it.productName,
      price: it.price,
      quantity: it.quantity,
      subtotal: it.subtotal,
    })),
  }));
}

/**
 * 按订单号查询单条订单（带完整明细）。
 * mall-api 是管理后台接口，按 orderNo 精确匹配即可，不按登录用户隔离。
 */
export const queryOrder = tool(
  async ({ orderNo }, config?: RunnableConfig) => {
    const { userToken } = getRuntime(config);
    if (!userToken) return NO_AUTH;

    const params = new URLSearchParams({
      orderNo,
      page: "1",
      size: "20",
    });

    const result = await mallServerFetch<PageResult<OrderVO>>(
      `/orders?${params.toString()}`,
      undefined,
      userToken,
    );

    const records = result?.records ?? [];
    if (!records.length) return `未找到订单号含 "${orderNo}" 的订单`;

    // 精确匹配：取 orderNo 完全等于的那条；模糊匹配命中多条也只返回一条详情
    const exact = records.find((o) => o.orderNo === orderNo) ?? records[0];

    const summary = summarize([exact])[0];
    return JSON.stringify(summary);
  },
  {
    name: "query_order",
    description:
      "根据订单号精确查询一条订单的完整信息（状态、金额、明细）。订单号格式为 ORD 开头，如 ORD20260910120000123100。若用户不知道订单号，应改用 list_orders 工具。",
    schema: z.object({
      orderNo: z.string().describe("订单号，ORD 开头"),
    }),
  },
);

/**
 * 列出订单列表，可按状态/订单号过滤，带分页。
 * mall-api 是管理后台接口，订单的 customer_id 引用 Customer 表，
 * 与登录账号 AdminUser 无映射关系，故不按登录用户强制过滤——
 * AI 客服在此架构下是管理员视角，查全量订单符合现有信任模型。
 */
export const listOrders = tool(
  async (
    { customerId, status, orderNo, page = 1, size = 10 },
    config?: RunnableConfig,
  ) => {
    const { userToken } = getRuntime(config);
    if (!userToken) return NO_AUTH;

    const params = new URLSearchParams({
      page: String(page),
      size: String(Math.min(size, 50)), // 上限 50，防止一次拉爆
    });
    if (customerId) params.set("customerId", customerId);
    if (orderNo) params.set("orderNo", orderNo);
    if (status !== undefined) params.set("status", String(status));

    const result = await mallServerFetch<PageResult<OrderVO>>(
      `/orders?${params.toString()}`,
      undefined,
      userToken,
    );

    const records = result?.records ?? [];
    if (!records.length) return "没有任何订单";

    const summary = summarize(records);
    return JSON.stringify({
      total: result.total,
      current: result.current,
      size: result.size,
      hasMore: result.current * result.size < result.total,
      orders: summary,
    });
  },
  {
    name: "list_orders",
    description:
      "列出订单列表，可按状态或订单号关键字过滤，支持分页。状态码：0待付款 1已付款 2已发货 3已完成 4已取消 5退款中 6已退款。适合回答'有哪些订单'、'查已付款的订单'这类问题。",
    schema: z.object({
      customerId: z
        .string()
        .optional()
        .describe("客户 ID，可选，不填则查询所有客户订单"),
      status: z
        .number()
        .int()
        .min(0)
        .max(6)
        .optional()
        .describe(
          "订单状态：0待付款 1已付款 2已发货 3已完成 4已取消 5退款中 6已退款",
        ),
      orderNo: z
        .string()
        .optional()
        .describe("订单号关键字（ORD 开头），模糊匹配"),
      page: z
        .number()
        .int()
        .positive()
        .optional()
        .default(1)
        .describe("页码，从 1 开始"),
      size: z
        .number()
        .int()
        .positive()
        .max(50)
        .optional()
        .default(10)
        .describe("每页条数，最大 50"),
    }),
  },
);
