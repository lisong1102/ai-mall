import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

/**
 * fromConnString 只解析连接串、不建立连接，
 * 因此模块导入阶段（含 next build 收集路由数据）不会触发数据库 I/O。
 */
export const checkpointer = PostgresSaver.fromConnString(
  process.env.DATABASE_URL || "",
);

let ready: Promise<void> | null = null;

/**
 * 幂等懒初始化：首次真正用到 checkpointer 时才建表。
 * 不能写成模块顶层 await——next build 会导入路由模块，
 * 构建期没有可连的数据库，会以 ECONNREFUSED 中断构建。
 */
export function ensureCheckpointerReady(): Promise<void> {
  ready ??= checkpointer.setup();
  return ready;
}
