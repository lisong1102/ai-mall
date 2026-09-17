import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { conversations, messages } from "./schema";

/**
 * 数据库连接实例。
 * schema 定义在 schema.ts（drizzle-kit generate 只读那个文件，不触发连接）。
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL 环境变量未设置");
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema: { conversations, messages } });
