/**
 * 浏览器端统一请求层：始终请求同源 BFF（/api/mall/*），由 Next 转发到 Java mall-api。
 * Java 返回 Result 包装（code=0 成功），此处解包；非 0 或网络错误抛 Error，
 * 交给 TanStack Query 的 error 状态统一处理。
 */

/** Java 端统一返回包装 */
export interface Result<T> {
  code: number;
  message: string;
  data: T;
}

/** Java 端统一分页结构 */
export interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

/**
 * 统一 fetch 封装。
 * @param path 业务路径，以 / 开头，如 "/categories?page=1&size=10"
 */
export async function mallFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api/mall${path}`, {
    headers: { "content-type": "application/json", ...init?.headers },
    ...init,
  });
  const result = (await res.json()) as Result<T>;
  if (!res.ok || result.code !== 0) {
    throw new Error(result.message ?? `请求失败（HTTP ${res.status}）`);
  }
  return result.data;
}
