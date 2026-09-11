import { mallHttp } from "../http";
import type {
  Category,
  CategorySaveReq,
  PageParams,
  PageResult,
} from "./types";

/** 分页查询类目（可按名称模糊搜索） */
export async function pageCategories(params?: PageParams & { name?: string }) {
  const res = await mallHttp.get<PageResult<Category>>("/categories", {
    params,
  });
  return res.data;
}

/** 查询类目详情 */
export async function getCategory(id: string) {
  const res = await mallHttp.get<Category>(`/categories/${id}`);
  return res.data;
}

/** 新增类目，返回新 ID */
export async function createCategory(req: CategorySaveReq) {
  const res = await mallHttp.post<string>("/categories", req);
  return res.data;
}

/** 修改类目 */
export async function updateCategory(id: string, req: CategorySaveReq) {
  await mallHttp.put<void>(`/categories/${id}`, req);
}

/** 删除类目 */
export async function deleteCategory(id: string) {
  await mallHttp.delete<void>(`/categories/${id}`);
}
