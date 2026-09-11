/**
 * AI 服务 → Java mall-api 的服务端 client。
 * 仅供 LangChain 工具（商品检索、订单查询等）在服务端使用；
 * 商城前端流量不经过本服务，而是经 nginx/Vite proxy 直连 Java。
 *
 * 鉴权约定：调用方传入用户 JWT，透传给 Java，保持与前端直连一致的权限模型。
 */
const BASE = process.env.MALL_API_BASE ?? "http://localhost:8080";

/** Java 端统一返回包装 */
export interface Result<T> {
  code: number;
  message: string;
  data: T;
}

/**
 * @param path 业务路径，以 / 开头，不含 /api 前缀，如 "/products?page=1"
 * @param userToken 当前用户 JWT（可选），透传 Authorization 头
 */
export async function mallServerFetch<T>(
  path: string,
  init?: RequestInit,
  userToken?: string,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");
  if (userToken) headers.set("authorization", `Bearer ${userToken}`);

  const res = await fetch(`${BASE}/api${path}`, {
    cache: "no-store",
    ...init,
    headers,
  });
  const result = (await res.json()) as Result<T>;
  if (!res.ok || result.code !== 0) {
    throw new Error(result.message ?? `mall-api 请求失败（HTTP ${res.status}）`);
  }
  return result.data;
}
