import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit 配置：用于生成/执行 migration、introspect 数据库等。
 * 运行 `npx drizzle-kit generate` 生成迁移 SQL，`npx drizzle-kit migrate` 执行。
 *
 * schema 指向用 pgSchema('ai') 定义表的文件，所有表落在 ai schema 下，
 * 与 Java 管理的 mall schema 物理隔离（同库不同 schema）。
 */
export default defineConfig({
  schema: "./src/lib/ai/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
