import { mallHttp } from "../http";
import type { EnumOption } from "./types";

/** 可下发的枚举类型名（与后端 EnumRegistry 注册表对应） */
export type EnumType = "order_status";

/**
 * 批量获取枚举选项（code/label/color）。
 * 枚举属于低频变更数据，调用方应配合 staleTime: Infinity 缓存整会话。
 */
export async function getEnums(types: EnumType[]) {
  const res = await mallHttp.get<Record<EnumType, EnumOption[]>>("/enums", {
    params: { types: types.join(",") },
  });
  return res.data;
}
