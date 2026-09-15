import axios, { AxiosError, type AxiosInstance } from "axios";
import { clearToken, getToken } from "@/lib/auth-token";

/**
 * Java 端统一返回包装（原始响应体形态）。
 * 响应拦截器已统一解包，业务代码不直接接触本类型。
 */
export interface Result<T> {
  code: number;
  message: string;
  data: T;
}

/**
 * 401 统一处理：清除失效 token 并跳回登录页（带上回跳地址）。
 * 已在登录页时不跳转，避免循环；用整页跳转保证所有内存状态随登录态一起重置。
 */
function handleUnauthorized() {
  clearToken();
  const { pathname, search } = window.location;
  if (pathname === "/login") return;
  const redirect = encodeURIComponent(pathname + search);
  window.location.assign(`/login?redirect=${redirect}`);
}

/**
 * axios 实例工厂：mall / ai 两个后端各一个实例，路径前缀不同、拦截规则一致。
 * baseURL 走同源相对路径，dev 由 Vite proxy、线上由 nginx 转发（见 vite.config.ts / nginx.conf）。
 */
function createHttp(baseURL: string): AxiosInstance {
  const instance = axios.create({ baseURL });

  // 请求拦截：注入 JWT（登录成功后由 AuthProvider 写入 localStorage）
  instance.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // 响应拦截：解包 Result——code≠0 抛 Error（message 取后端文案），
  // 成功时把 res.data 替换为业务数据，调用方拿到纯净的 T
  instance.interceptors.response.use(
    (res) => {
      const result = res.data as Result<unknown>;
      if (result && typeof result.code === "number") {
        if (result.code !== 0) {
          // 业务体里的 401（理论上拦截器已用 HTTP 状态拦截，双保险）
          if (result.code === 401) handleUnauthorized();
          throw new Error(result.message ?? "请求失败");
        }
        res.data = result.data;
      }
      return res;
    },
    (error: AxiosError<Result<unknown>>) => {
      // HTTP 401：token 缺失/过期/非法，统一踢回登录页
      if (error.response?.status === 401) {
        handleUnauthorized();
        return Promise.reject(new Error("登录已过期，请重新登录"));
      }
      // 其余 HTTP 层失败（网络错误 / 4xx / 5xx）：优先取后端 Result.message
      const message =
        error.response?.data?.message ?? error.message ?? "网络异常";
      return Promise.reject(new Error(message));
    },
  );

  return instance;
}

/** 商城业务后端（Java mall-api） */
export const mallHttp = createHttp("/api/mall");

/** AI 服务（Next.js apps/ai） */
export const aiHttp = createHttp("/api/ai");
