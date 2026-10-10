import { mallHttp } from "../http";
import type { OrderSaveReq, OrderVO, PageParams, PageResult } from "./types";

/** 订单状态：0待付款 1已付款 2已发货 3已完成 4已取消 5退款中 6已退款 */
export type OrderStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** 分页查询订单（订单号模糊 + 客户/状态过滤，联表返回客户名） */
export async function pageOrders(
  params?: PageParams & {
    orderNo?: string;
    customerId?: string;
    status?: OrderStatus | "";
  },
) {
  const res = await mallHttp.get<PageResult<OrderVO>>("/orders", { params });
  return res.data;
}

/** 查询订单详情（含明细列表） */
export async function getOrder(id: string) {
  const res = await mallHttp.get<OrderVO>(`/orders/${id}`);
  return res.data;
}

/** 创建订单（事务化：主表 + 明细），返回新订单 ID */
export async function createOrder(req: OrderSaveReq) {
  const res = await mallHttp.post<string>("/orders", req);
  return res.data;
}

/** 切换订单状态 */
export async function updateOrderStatus(id: string, status: OrderStatus) {
  await mallHttp.put<void>(`/orders/${id}/status`, null, {
    params: { status },
  });
}

/** 删除订单（明细级联删除） */
export async function deleteOrder(id: string) {
  await mallHttp.delete<void>(`/orders/${id}`);
}
