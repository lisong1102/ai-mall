import { mallHttp } from "../http";
import type {
  Customer,
  CustomerSaveReq,
  PageParams,
  PageResult,
} from "./types";

/** 分页查询客户（姓名或手机号模糊搜索） */
export async function pageCustomers(params?: PageParams & { name?: string }) {
  const res = await mallHttp.get<PageResult<Customer>>("/customers", {
    params,
  });
  return res.data;
}

/** 查询客户详情 */
export async function getCustomer(id: string) {
  const res = await mallHttp.get<Customer>(`/customers/${id}`);
  return res.data;
}

/** 新增客户，返回新 ID */
export async function createCustomer(req: CustomerSaveReq) {
  const res = await mallHttp.post<string>("/customers", req);
  return res.data;
}

/** 修改客户 */
export async function updateCustomer(id: string, req: CustomerSaveReq) {
  await mallHttp.put<void>(`/customers/${id}`, req);
}

/** 删除客户 */
export async function deleteCustomer(id: string) {
  await mallHttp.delete<void>(`/customers/${id}`);
}
