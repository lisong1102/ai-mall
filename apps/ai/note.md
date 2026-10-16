# 1. Drizzle 管理

## 1.1 是什么

Drizzle 是 TypeScript ORM，等价于 Java 侧的 MyBatis-Plus + Flyway 合体：

- 用 TS 代码声明表结构（代替手写 SQL 建表）
- 用类型安全的查询 API 操作数据库（代替写字符串 SQL）
- 用 drizzle-kit 命令行工具生成和执行 migration（代替 Flyway）

## 1.2 文件结构

| 文件                   | 作用             | 说明                                                         |
| ---------------------- | ---------------- | ------------------------------------------------------------ |
| `src/lib/ai/schema.ts` | 表结构定义       | 唯一事实来源，改表只改这里，不能包含运行时副作用（如建连接） |
| `src/lib/ai/db.ts`     | 数据库连接实例   | import schema.ts 的表定义，导出 `db` 实例供业务代码使用      |
| `drizzle.config.ts`    | drizzle-kit 配置 | 指向 schema.ts，配置数据库连接信息                           |
| `drizzle/`             | migration 目录   | 生成的 SQL 迁移文件，不可修改                                |

> 为什么拆分 schema.ts 和 db.ts？drizzle-kit generate 会执行 schema 文件的全部代码，如果数据库连接写在同一个文件里，缺少环境变量就会报错。

## 1.3 表定义写法

```typescript
import { pgSchema, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

const ai = pgSchema("ai"); // 所有表挂在 ai schema 下

export const conversations = ai.table(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("conversations_user_idx").on(t.userId)], // 新写法：返回数组
);

// 导出类型，供 service 层使用
export type Conversation = typeof conversations.$inferSelect;
```

> 注意：第三个参数（extraConfig）的新写法返回**数组** `(t) => [...]`，旧写法返回对象 `(t) => ({...})` 已被标记 `@deprecated`。

## 1.4 日常工作流

```bash
# 1. 改表结构 → 编辑 src/lib/ai/schema.ts

# 2. 生成 migration SQL（不需要 DATABASE_URL）
npx drizzle-kit generate

# 3. 执行 migration（需要 DATABASE_URL）
npx drizzle-kit migrate
```

## 1.5 常用查询写法

```typescript
import { db, conversations, messages } from "@/lib/ai/db";
import { eq, asc } from "drizzle-orm";

// 查询：select + where + orderBy
const history = await db
  .select()
  .from(messages)
  .where(eq(messages.conversationId, conversationId))
  .orderBy(asc(messages.createdAt));

// 新增
const [conv] = await db
  .insert(conversations)
  .values({ userId: "xxx", title: "新对话" })
  .returning(); // 返回插入的行（含自动生成的 id）

// 更新
await db
  .update(conversations)
  .set({ title: "新标题" })
  .where(eq(conversations.id, conversationId));

// 删除（级联删除由外键 onDelete: cascade 保证）
await db.delete(conversations).where(eq(conversations.id, id));
```

## 1.6 与 Java 侧的对比

|                  | Java (mall-api)     | Next.js (ai)                        |
| ---------------- | ------------------- | ----------------------------------- |
| ORM              | MyBatis-Plus        | Drizzle ORM                         |
| 迁移工具         | Flyway              | drizzle-kit                         |
| schema           | `mall`              | `ai`                                |
| 定义表           | `@TableName` 实体类 | `ai.table(...)` 声明                |
| 类型安全查询     | LambdaQueryWrapper  | `db.select().from().where(eq(...))` |
| migration 不可变 | 是                  | 是                                  |

## 1.7 注意事项

- migration 文件一旦生成不可修改，改表要新建一个 migration
- schema.ts 不能包含运行时副作用代码（如 `postgres()` 建连接），否则 drizzle-kit generate 会报错
- ai service 只操作 `ai` schema，不访问 `mall` schema，跨 schema 数据走 HTTP 接口
- `pgSchema("ai")` 确保表建在 ai schema 下，与 Java 侧物理隔离

# 2. DrizzleVectorStore 检索 SQL（similaritySearchVectorWithScore）

## 2.1 生成的 SQL

`src/lib/ai/vector-store.ts` 的 `similaritySearchVectorWithScore` 最终生成一条 SQL：

```sql
SELECT "id", "content", "document_id", "sequence",
       ("embedding" <=> $1::vector) AS "distance"
FROM "ai"."document_chunks"
WHERE "embedding" IS NOT NULL
  AND "document_id" IN ($2, $3, ...)
ORDER BY ("embedding" <=> $1::vector) ASC
LIMIT $k;
```

不带 `documentIds` 过滤时去掉 `AND document_id IN (...)` 那行。

## 2.2 逐点解释

- **`$1::vector` 查询向量参数化**：`${queryVec}` 在 Drizzle `sql` 模板里是绑定参数（不是字符串拼接），生成 `$1`，再 `::vector` 显式转型成 pgvector 类型，无 SQL 注入风险
- **`<=>` cosine 距离算子**：pgvector 三算子 `<=>`（cosine）/ `<->`（L2）/ `<#>`（负内积）；BGE 输出归一化向量，cosine 距离与点积等价且最稳，值域 0（完全同向）~ 2（完全反向），越小越相似
- **`IS NOT NULL`**：embedding 列是 nullable，NULL 与向量做 `<=>` 会直接报错，先过滤
- **`ORDER BY ... ASC` + `LIMIT k`**：cosine 距离升序取 top-k 最近邻
- **`IN (...)`**：`documentIds` 走 Drizzle `inArray`，同样绑定参数

## 2.3 distance 是计算列不是物理列

```ts
distance: distanceExpr.as("distance"),
```

`.as("distance")` 生成 SQL 的 `AS` 别名，表里没有这一列：

```sql
("embedding" <=> $1::vector) AS "distance"   -- 逐行实时计算
```

- 同理 `SELECT price * quantity AS total` 的 `total` 也不在表里，表数据不变
- select 里的 `id`/`content`/`document_id`/`sequence` 是物理列直接读，`distance` 是每行用自己的 embedding 与查询向量现场算的临时值
- Drizzle 按别名映射回 JS 字段，所以代码里 `Number(row.distance)` 能取到
- 它同时承担投影（返回分数）和排序依据（`orderBy(distanceExpr)` 用同一表达式，PostgreSQL 也允许 `ORDER BY "distance"` 引用别名）

## 2.4 已知限制：顺序扫描

目前只有 `document_id` 的 btree 索引，embedding 列没建向量索引，查询走全表顺序扫描。学习项目数据量小够用；chunks 上万后需加 HNSW 索引：

```sql
CREATE INDEX ON ai.document_chunks
USING hnsw (embedding vector_cosine_ops);
```

索引建在 embedding 物理列上，让"逐行算距离"退化成"先按索引找最近邻再算"。

