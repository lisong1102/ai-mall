import { mallHttp } from "../http";
import type { PageParams, PageResult, ProductSaveReq, ProductVO } from "./types";

/** 分页查询商品（名称模糊 + 类目/状态过滤，联表返回类目名） */
export async function pageProducts(
  params?: PageParams & { name?: string; categoryId?: string; status?: number },
) {
  const res = await mallHttp.get<PageResult<ProductVO>>("/products", {
    params,
  });
  return res.data;
}

/** 查询商品详情（联表返回类目名） */
export async function getProduct(id: string) {
  const res = await mallHttp.get<ProductVO>(`/products/${id}`);
  return res.data;
}

/** 新增商品，返回新 ID */
export async function createProduct(req: ProductSaveReq) {
  const res = await mallHttp.post<string>("/products", req);
  return res.data;
}

/** 修改商品 */
export async function updateProduct(id: string, req: ProductSaveReq) {
  await mallHttp.put<void>(`/products/${id}`, req);
}

/** 切换上下架：status=1 上架 / 0 下架 */
export async function updateProductStatus(id: string, status: 0 | 1) {
  await mallHttp.put<void>(`/products/${id}/status`, null, {
    params: { status },
  });
}

/** 删除商品 */
export async function deleteProduct(id: string) {
  await mallHttp.delete<void>(`/products/${id}`);
}
