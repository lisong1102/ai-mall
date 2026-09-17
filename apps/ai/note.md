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
