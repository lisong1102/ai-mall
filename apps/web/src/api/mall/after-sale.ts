import { mallHttp } from "../http";
import type {
  AfterSaleSaveReq,
  AfterSaleVO,
  PageParams,
  PageResult,
} from "./types";

/** 分页查询售后（按订单/客户/状态过滤，联表返回订单号与客户名） */
export async function pageAfterSales(
  params?: PageParams & {
    orderId?: string;
    customerId?: string;
    status?: number;
  },
) {
  const res = await mallHttp.get<PageResult<AfterSaleVO>>("/after-sales", {
    params,
  });
  return res.data;
}

/** 查询售后详情 */
export async function getAfterSale(id: string) {
  const res = await mallHttp.get<AfterSaleVO>(`/after-sales/${id}`);
  return res.data;
}

/** 申请售后（状态固定为 0 申请中），返回新 ID */
export async function applyAfterSale(req: AfterSaleSaveReq) {
  const res = await mallHttp.post<string>("/after-sales", req);
  return res.data;
}

/** 审核售后：pass=true 通过 / false 拒绝（仅申请中可审核） */
export async function reviewAfterSale(id: string, pass: boolean) {
  await mallHttp.put<void>(`/after-sales/${id}/review`, null, {
    params: { pass },
  });
}

/** 完成售后（仅审核通过可完成） */
export async function completeAfterSale(id: string) {
  await mallHttp.put<void>(`/after-sales/${id}/complete`);
}

/** 删除售后单 */
export async function deleteAfterSale(id: string) {
  await mallHttp.delete<void>(`/after-sales/${id}`);
}
