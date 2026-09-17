import { mallHttp } from "../http";

/** mall-api 健康检查返回 */
export interface MallHealth {
  status: string;
  service: string;
}

/** 探活 mall-api 服务 */
export async function getMallHealth() {
  const res = await mallHttp.get<MallHealth>("/health");
  return res.data;
}
