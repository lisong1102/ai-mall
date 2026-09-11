import axios, { AxiosError, type AxiosInstance } from "axios";

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
 * axios 实例工厂：mall / ai 两个后端各一个实例，路径前缀不同、拦截规则一致。
 * baseURL 走同源相对路径，dev 由 Vite proxy、线上由 nginx 转发（见 vite.config.ts / nginx.conf）。
 */
function createHttp(baseURL: string): AxiosInstance {
  const instance = axios.create({ baseURL });

  // 请求拦截：注入 JWT（P1.8 登录功能落地后写入 localStorage，此处统一附带）
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
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
          throw new Error(result.message ?? "请求失败");
        }
        res.data = result.data;
      }
      return res;
    },
    (error: AxiosError<Result<unknown>>) => {
      // HTTP 层失败（网络错误 / 4xx / 5xx）：优先取后端 Result.message
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
