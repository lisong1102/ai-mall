import { mallHttp } from "../http";
import type { AdminUser, LoginReq, LoginResp, RegisterReq } from "./types";

/** 用户名密码登录，返回 JWT 与用户信息 */
export async function login(body: LoginReq) {
  const res = await mallHttp.post<LoginResp>("/auth/login", body);
  return res.data;
}

/** 注册新管理员账号 */
export async function register(body: RegisterReq) {
  await mallHttp.post("/auth/register", body);
}

/** 查询当前登录用户（凭 Authorization 头里的 JWT） */
export async function getMe() {
  const res = await mallHttp.get<AdminUser>("/auth/me");
  return res.data;
}
