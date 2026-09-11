import { mallHttp } from "../http";

interface Health {
  status: string;
  service: string;
}

/** Java mall-api 健康检查 */
export async function getMallHealth() {
  const res = await mallHttp.get<Health>("/health");
  return res.data;
}
