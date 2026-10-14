// src/ai/tools/order.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getWriter } from "@langchain/langgraph";
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
 * 统计符合条件的订单数量（双通道，参照 compare_growth）：
 * - getWriter().write() → 前端（custom 流）：跳转卡片（总数 + 筛选条件 + 链接参数），不过模型
 * - return → 模型（ToolMessage）：匹配条数摘要，模型拿不到明细，无法罗列订单
 */
export const listOrders = tool(
  async ({ customerId, status, orderNo }, config?: RunnableConfig) => {
    const { userToken } = getRuntime(config);
    if (!userToken) return NO_AUTH;

    // 只要 total，size=1 最小化传输（分页由前端订单页自己做）
    const params = new URLSearchParams({ page: "1", size: "1" });
    if (customerId) params.set("customerId", customerId);
    if (orderNo) params.set("orderNo", orderNo);
    if (status !== undefined) params.set("status", String(status));

    const result = await mallServerFetch<PageResult<OrderVO>>(
      `/orders?${params.toString()}`,
      undefined,
      userToken,
    );
    const total = result?.total ?? 0;

    // 筛选条件描述（模型摘要 + 卡片展示共用）
    const filters: string[] = [];
    if (customerId) filters.push(`客户 ${customerId}`);
    if (orderNo) filters.push(`订单号含 ${orderNo}`);
    if (status !== undefined) filters.push(ORDER_STATUS[status] ?? "未知状态");
    const filterDesc = filters.length ? `（${filters.join("、")}）` : "";

    // 通道 1：给前端 —— 跳转卡片
    // 注意：getWriter 必须显式传入工具的 config——子图 invoke 链路中
    // AsyncLocalStorage 上下文里没有 writer，无参调用会静默拿不到
    getWriter(config)?.({
      type: "component",
      name: "order_list_summary",
      props: { total, filterDesc, customerId, status, orderNo },
    });

    // 通道 2：给模型
    if (!total) {
      return `没有符合条件的订单${filterDesc}。查询结果卡片已展示给用户，请直接告知用户没有匹配的订单。`;
    }
    return `共匹配到 ${total} 条订单${filterDesc}。订单明细已通过前端卡片展示，用户点击卡片即可跳转订单管理页查看完整列表。请简短告知用户匹配条数并引导点击卡片查看，不要罗列或编造具体订单信息。`;
  },
  {
    name: "list_orders",
    description:
      "统计符合条件的订单数量，并在前端生成订单列表跳转卡片（不返回订单明细）。所有'查看订单列表'类问题都用它：查所有订单、某客户的全部订单、某状态的订单等。状态码：0待付款 1已付款 2已发货 3已完成 4已取消 5退款中 6已退款。",
    schema: z.object({
      customerId: z
        .string()
        .optional()
        .describe("客户 ID，可选，不填则统计所有客户订单"),
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
    }),
  },
);
