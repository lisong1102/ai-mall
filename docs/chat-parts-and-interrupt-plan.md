# 聊天消息结构化（parts）+ 人工审批（interrupt）实施文档

> 状态：方案已评审定稿，待实施。本文档按步骤拆分，每步附代码与命令，按顺序独立实施。
>
> 前置讨论结论（不再重复论证）：
> 1. 三类内容（纯文本 / 审批卡片 / 自定义组件）统一为 **content = parts 数组**（jsonb），单一事实来源
> 2. SSE 协议升级为 **discriminated union**：`{type: "delta" | "component" | "approval" | "error"}`
> 3. 中断用 LangGraph `interrupt()`（挂起靠 checkpoint，不能用工具 return 模拟）
> 4. 组件数据走 `getWriter().write()`（custom 流），**UI 明细数据绕过模型**；工具 return 只给模型结论摘要
> 5. append-only 原则：中断 1 条消息（含卡片 part），恢复追加 2 条（决策留痕 + 最终回复），仅 meta 做一次状态翻转

---

## 一、目标映射

| 需求 | 实现机制 |
|------|---------|
| 1. 用户可中断，前端要展示 | refundAgent 中间件 `interrupt()` → SSE `approval` 帧 → 前端 ApprovalCard → `POST /api/chat/resume` 恢复 |
| 2. 自定义 UI 对话，前端要展示 | 工具内 `getWriter().write({type:"component",...})` → SSE `component` 帧 → 前端组件注册表 |
| 3. 普通对话 markdown 展示 | text part 走 ReactMarkdown，与现有逻辑一致 |
| 4. content 存 parts 数组 | `ai.messages.content` text → jsonb（`MessagePart[]`）+ 新增 `meta` jsonb |

## 二、总体数据流

```
【写路径】
工具/中间件                    stream 解析(chat-service)            SSE                前端
─────────────────────────────────────────────────────────────────────────────────────────
模型流式文本        ──messages──▶ pushText(parts) ──────────────▶ {type:"delta"} ──▶ 文本段追加
工具内 getWriter()  ──custom ──▶ push component part ──────────▶ {type:"component"}▶ 注册表渲染组件
中间件 interrupt()  ──updates─▶ push approval part + meta ─────▶ {type:"approval"}─▶ ApprovalCard
                                                                    │ 流结束
                                                                    ▼
                                                    insertMessage(role, parts, meta)  一次性落库

【恢复路径】
刷新页面 ──▶ GET /conversation/messages ──▶ content(parts) + meta(approval.status) ──▶ renderParts 重渲染
点击审批 ──▶ POST /api/chat/resume ──▶ Command({resume}) ──▶ 恢复执行（只重放 tools 节点）──▶ 同上写路径
```

**消息表时间线**（以退单审批为例）：

| 时机 | role | content (jsonb parts) | meta |
|------|------|----------------------|------|
| 用户提问 | user | `[{type:"text",text:"帮我退掉 ORD888"}]` | — |
| 中断挂起 | assistant | `[{type:"text",text:"好的…"},{type:"approval",approval:{orderNo,amount,reason}}]` | `{approval:{status:"pending",…}}` |
| 审批后 | user | `[{type:"text",text:"【审批】同意退款"}]` | — |
| 审批后 | assistant | `[{type:"text",text:"退款已提交…"}]`（流式） | — |

挂起那条消息的 meta 由 `pending` 翻转为 `resolved`（唯一一次回写，卡片从可操作变为结果标签）。

## 三、实施步骤

---

### 阶段一：后端（apps/ai）

---

### Step 1 共享类型定义

**文件**：新建 `apps/ai/src/type/message-part.ts`，并从 `apps/ai/src/type/index.ts` 导出。

```ts
// apps/ai/src/type/message-part.ts

/** 消息内容片段：一条消息 = parts 数组，存 ai.messages.content (jsonb) */
export type MessagePart =
  | { type: "text"; text: string }
  /** 审批请求卡片（interrupt value 透传） */
  | { type: "approval"; approval: RefundApprovalRequest }
  /** 自定义业务组件（前端注册表按 name 渲染） */
  | { type: "component"; name: string; props: Record<string, unknown> };

/** 审批请求（中间件 interrupt 的 payload，SSE approval 帧与前端卡片共用） */
export interface RefundApprovalRequest {
  reason: string;
  orderNo: string;
  amount: number;
}

/** 审批决策（resume 请求体 = Command resume payload） */
export interface RefundApprovalDecision {
  approved: boolean;
  note?: string;
}

/** meta.approval 状态机：pending → resolved（resolved 时补充 approved/note） */
export interface ApprovalMeta extends RefundApprovalRequest {
  status: "pending" | "resolved";
  approved?: boolean;
  note?: string | null;
}

/** 提取纯文本（非流式 reply / 预览 / 喂模型降级用） */
export function textContentOf(parts: MessagePart[]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/** SSE 流事件协议（http.ts sseResponse 逐帧 JSON 序列化） */
export type ChatStreamEvent =
  | { type: "delta"; conversationId: string; delta: string }
  | { type: "component"; conversationId: string; name: string; props: Record<string, unknown> }
  | { type: "approval"; conversationId: string; approval: RefundApprovalRequest }
  | { type: "error"; conversationId: string; error: string };
```

> 注意：`http.ts` 的 `sseResponse` 异常兜底帧是 `{error: "..."}`（无 type），前端要兼容两种形态，见 Step 9。

---

### Step 2 数据库：content 改 jsonb + 新增 meta

**文件**：`apps/ai/src/lib/ai/schema.ts`（messages 表定义在 L45-59）

```ts
import { pgSchema, uuid, text, timestamp, index, jsonb } from "drizzle-orm/pg-core";

export const messages = ai.table(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    // MessagePart[]：[{type:"text",text}|{type:"approval",...}|{type:"component",...}]
    content: jsonb("content").notNull(),
    // 状态类信息：{ approval?: ApprovalMeta }
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("messages_conv_idx").on(t.conversationId)],
);
```

**迁移处理**（text → jsonb 有旧数据时 ALTER 会失败，二选一）：

- **方案 A（推荐，开发数据可清）**：先清空消息表再生成迁移

```bash
# 1. 清空旧消息（学习项目，展示层数据可丢）
docker exec -it <postgres容器> psql -U <用户> -d <库> -c "TRUNCATE ai.messages;"
# 2. 生成 + 执行迁移（apps/ai 目录下，脚本已含 dotenv-cli 加载 .env.local）
cd apps/ai
pnpm db:generate
pnpm db:migrate
```

- **方案 B（保留历史）**：`pnpm db:generate` 后，手动编辑生成的 migration SQL，为 ALTER 加 USING 并回填：

```sql
ALTER TABLE "ai"."messages" ALTER COLUMN "content" SET DATA TYPE jsonb
  USING jsonb_build_array(jsonb_build_object('type', 'text', 'text', "content"));
ALTER TABLE "ai"."messages" ADD COLUMN "meta" jsonb;
```

**验证**：`pnpm db:migrate` 成功；`\d ai.messages` 确认 content 为 jsonb、meta 列存在。

---

### Step 3 conversation-repo 改造

**文件**：`apps/ai/src/lib/ai/services/conversation-repo.ts`

```ts
import { desc, eq, and, sql } from "drizzle-orm";
import type { MessagePart, RefundApprovalDecision } from "@/type";

/** 落库一条消息（content 为 parts 数组），meta 可选 */
export async function insertMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: MessagePart[],
  meta?: Record<string, unknown>,
) {
  const [row] = await db
    .insert(messages)
    .values({ conversationId, role, content, meta })
    .returning();
  return row;
}

/**
 * 审批状态翻转：该会话 meta.approval.status = pending 的最新一条 → resolved。
 * 返回 false 表示没有 pending 行（已被处理）→ 作为幂等闩使用。
 */
export async function resolveApprovalMeta(
  conversationId: string,
  decision: RefundApprovalDecision,
): Promise<boolean> {
  const [row] = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        sql`${messages.meta}->'approval'->>'status' = 'pending'`,
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(1);
  if (!row) return false;

  const prev = (row.meta ?? {}) as { approval?: Record<string, unknown> };
  const meta = {
    ...prev,
    approval: {
      ...prev.approval,
      status: "resolved",
      approved: decision.approved,
      note: decision.note ?? null,
    },
  };
  await db.update(messages).set({ meta }).where(eq(messages.id, row.id));
  return true;
}
```

其余两处适配：

```ts
// listMessages（喂模型用，L64-82）：content 已是数组，喂模型前取纯文本
return rows
  .reverse()
  .map((r) => ({
    role: r.role as "user" | "assistant",
    content: textContentOf(r.content as MessagePart[]),
  }));

// listMessagesForDisplay（L89-100）：select 增加 meta
.select({
  id: messages.id,
  role: messages.role,
  content: messages.content,
  meta: messages.meta,     // ← 新增
  createdAt: messages.createdAt,
})
```

> `listMessages` 当前已无调用方（上下文走 checkpointer），但保持函数可用以免后续误用。

---

### Step 4 refundAgent：审批中间件 + checkpointer

**文件**：`apps/ai/src/ai/agents/refundAgent.ts`（整体替换中间件与 createAgent 配置）

关键点：
1. **金额以服务端查单为准**（模型入参不可信，工具 schema 里也没有可靠金额）
2. `interrupt()` 挂起；恢复后从返回值拿决策；拒绝转 error ToolMessage
3. **`checkpointer: true`**：子 agent 继承父图 PostgresSaver。没有它 interrupt 无法断点续传——父图 resume 时重跑 `refund` 节点的 `agent.invoke`，靠子 agent 自己的 checkpoint 跳回 tools 节点继续，而不是重跑整个对话

```ts
import { kimiModel } from "@/model";
import { createAgent, createMiddleware, ToolMessage } from "langchain";
import { interrupt } from "@langchain/langgraph";
import { initiateRefund, queryOrder } from "../tools";
import { mallServerFetch } from "@/lib/mall-server";
import { PageResult, OrderVO } from "@/type";
import type { RefundApprovalDecision, RefundApprovalRequest } from "@/type";

const APPROVAL_THRESHOLD = 500;

const refundApprovalMiddleware = createMiddleware({
  name: "refund_approval",
  async wrapToolCall(request, next) {
    if (request.toolCall?.name !== "initiate_refund") return next(request);

    // 服务端查单金额（模型给的金额不可信）
    const orderNo = (request.toolCall.args as { orderId: string }).orderId;
    const userToken = request.runtime?.configurable?.userToken as string | undefined;
    let amount = 0;
    try {
      const data = await mallServerFetch<PageResult<OrderVO>>(
        `/orders?orderNo=${orderNo}&page=1&size=1`,
        undefined,
        userToken,
      );
      amount = Number(data?.records?.[0]?.totalAmount ?? 0);
    } catch {
      // 查不到金额 → 保守走人工审批（amount=0 会误放行，需改成查不到即审批）
      amount = APPROVAL_THRESHOLD + 1;
    }
    if (amount <= APPROVAL_THRESHOLD) return next(request);

    // 挂起：写 checkpoint；恢复执行时此调用直接返回决策
    const decision = interrupt<RefundApprovalRequest, RefundApprovalDecision>({
      reason: `退款金额 ${amount} 元超过 ${APPROVAL_THRESHOLD} 元，需要人工审批`,
      orderNo,
      amount,
    });

    if (!decision.approved) {
      return new ToolMessage({
        content: `退款申请被拒绝。原因：${decision.note ?? "未通过审核"}`,
        tool_call_id: request.toolCall.id ?? "",
        name: request.toolCall.name,
        status: "error",
      });
    }
    return next(request); // 同意 → 真正执行 initiate_refund
  },
});

export const refundAgent = createAgent({
  name: "refundAgent",
  model: kimiModel,
  tools: [queryOrder, initiateRefund],
  middleware: [refundApprovalMiddleware],
  checkpointer: true, // ★ 关键：继承父图 checkpointer，interrupt 才能挂起/恢复
  systemPrompt: `你是退款专员。流程：
1. 先用 query_order 确认订单存在且状态允许退款（已发货 / 已送达可退）
2. 调 initiate_refund 发起退款，金额以订单金额为准（除非用户明确要部分退款）
3. 退款成功后告知用户退款编号和预计到账时间。`,
});
```

**验证点**：
- `request.runtime?.configurable?.userToken` 是否取到（先 `console.log(request)` 确认 runtime 结构；若 undefined，检查 langchain 版本的 MiddlewareRequest 字段名）
- 查不到订单金额时走审批分支（上面已按保守处理）

---

### Step 5 chat-service：三模式流解析 + parts 组装 + 挂起守卫 + resume

**文件**：`apps/ai/src/lib/ai/services/chat-service.ts`（核心改造，替换 L42-46 协议、L66-75 send、L132-153 stream 尾段，新增 resume）

**5.1 顶部新增 import 与辅助函数**

```ts
import { Command } from "@langchain/langgraph";
import type { AIMessageChunk } from "@langchain/core/messages";
import type {
  ChatStreamEvent,
  MessagePart,
  RefundApprovalDecision,
  RefundApprovalRequest,
} from "@/type";
import { textContentOf } from "@/type";
import { resolveApprovalMeta } from "./conversation-repo";

/** 查询会话是否有待恢复的 interrupt（发消息守卫 / resume 幂等 / 历史兜底共用） */
async function getPendingInterrupt(
  conversationId: string,
): Promise<RefundApprovalRequest | null> {
  const state = await graph.getState({
    configurable: { thread_id: conversationId },
  });
  const task = state.tasks.find((t) => t.interrupts?.length);
  return (
    (task?.interrupts?.[0] as { value?: RefundApprovalRequest } | undefined)
      ?.value ?? null
  );
}

/** parts 组装：text 就地追加（连续文本合一段），其余新开一段。service/前端同一套规则 */
function pushText(parts: MessagePart[], text: string) {
  const last = parts[parts.length - 1];
  if (last?.type === "text") last.text += text;
  else parts.push({ type: "text", text });
}
```

**5.2 协议类型替换（L42-46）**

```ts
export type { ChatStreamEvent }; // 从 @/type 导出，删除旧的 {conversationId, delta} 接口
```

**5.3 stream() 改造**

```ts
async *stream(
  input: ChatRequest,
  user: ChatUser,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  // ── 1. 解析 / 新建 conversation（原逻辑 + 两处新增）─────
  if (input.conversationId) {
    const conv = await getConversation(input.conversationId);
    if (!conv) throw new Error("会话不存在");
    if (conv.userId !== user.userId) throw new Error("会话不存在"); // ★ 归属校验（原缺失，顺手补）
    // ...原有赋值不变
  }
  // ...新建分支不变...

  // ★ 挂起守卫：有 pending interrupt 的 thread 直接喂新消息行为不可靠，必须先处理审批
  const pending = await getPendingInterrupt(conversationId);
  if (pending) {
    throw new Error("当前会话有一笔退款待审批，请先在审批卡片中处理");
  }

  // ── 3. 存 user message（content 改为 parts）────────────
  await insertMessage(conversationId, "user", [
    { type: "text", text: input.message },
  ]);

  // ── 4. 启动 agent 流：三模式 ────────────────────────────
  // messages → 模型文本；custom → 工具内 getWriter 写的组件事件；updates → interrupt 挂起帧
  const stream = await agent.stream(
    { messages: [{ role: "user", content: input.message }] },
    {
      streamMode: ["messages", "custom", "updates"],
      signal,
      configurable: { thread_id: conversationId, userToken: user.token },
    },
  );

  // ── 5. 单次顺序遍历，按 mode 分类 fold 成 parts ─────────
  // 多模式下事件是三元组 [namespaces, mode, chunk]（@langchain/langgraph StreamChunk 类型）
  const parts: MessagePart[] = [];
  for await (const [, mode, chunk] of stream) {
    if (mode === "messages") {
      const [aiChunk, metadata] = chunk as [
        AIMessageChunk,
        { langgraph_node?: string },
      ];
      if (metadata?.langgraph_node !== "model_request") continue;
      if (aiChunk._getType?.() !== "ai") continue;
      const content = aiChunk.content;
      if (typeof content !== "string" || content.length === 0) continue;
      pushText(parts, content);
      yield { type: "delta", conversationId, delta: content };

    } else if (mode === "custom") {
      const ev = chunk as { type?: string; name?: string; props?: unknown };
      if (ev?.type !== "component") continue;
      parts.push({ type: "component", name: ev.name!, props: (ev.props ?? {}) as Record<string, unknown> });
      yield { type: "component", conversationId, name: ev.name!, props: (ev.props ?? {}) as Record<string, unknown> };

    } else if (mode === "updates") {
      // interrupt 挂起帧：{ __interrupt__: [{ value, id, resumable }] }
      const item = (chunk as { __interrupt__?: Array<{ value: unknown }> })
        .__interrupt__?.[0];
      if (item) {
        const approval = item.value as RefundApprovalRequest;
        parts.push({ type: "approval", approval });
        yield { type: "approval", conversationId, approval };
      }
      // 其余节点完成 update（含大 payload 的整段消息列表）一律忽略
    }
  }

  // ── 6. 整轮 parts 一次性落库（原子）─────────────────────
  if (parts.length === 0) throw new Error("AI 未返回内容");
  const isInterrupted = parts.some((p) => p.type === "approval");
  await insertMessage(
    conversationId,
    "assistant",
    parts,
    isInterrupted
      ? { approval: { status: "pending", ...(parts.find((p) => p.type === "approval") as { approval: RefundApprovalRequest }).approval } }
      : undefined,
  );
  if (isNew && title === "新对话") {
    await updateTitle(conversationId, input.message.slice(0, TITLE_LIMIT));
  }
}
```

> 注意：挂起轮落库的 parts 里 approval part 只含请求字段（无 status），status 存 meta —— 渲染以 meta 为准，见 Step 12。

**5.4 send() 适配（L66-75）**

```ts
async send(input: ChatRequest, user: ChatUser): Promise<ChatResponse> {
  let reply = "";
  let conversationId = "";
  for await (const ev of this.stream(input, user)) {
    conversationId = ev.conversationId;
    if (ev.type === "delta") reply += ev.delta;
  }
  return { conversationId, reply };
}
```

**5.5 新增 resume()（与 stream 同级方法）**

```ts
/** 恢复被 interrupt 挂起的会话：决策回传 → 从 tools 节点继续 → 流式返回最终回复 */
async *resume(
  conversationId: string,
  decision: RefundApprovalDecision,
  user: ChatUser,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  // 1. 归属校验（资金操作必须）
  const conv = await getConversation(conversationId);
  if (!conv || conv.userId !== user.userId) throw new Error("会话不存在");

  // 2. 幂等闩：meta 翻转失败说明已被处理（双开标签页/重复点击）
  const ok = await resolveApprovalMeta(conversationId, decision);
  if (!ok) throw new Error("该审批已处理，请刷新页面");
  if (!(await getPendingInterrupt(conversationId))) {
    throw new Error("当前会话没有待审批的请求");
  }

  // 3. 决策留痕（展示层 user 消息；模型靠 Command resume 拿到决策，不读消息表）
  await insertMessage(conversationId, "user", [
    {
      type: "text",
      text: `【审批】${decision.approved ? "同意" : "拒绝"}退款${decision.note ? `：${decision.note}` : ""}`,
    },
  ]);

  // 4. 恢复执行：只重放 tools 节点（子 agent 有自己的 checkpoint），不重跑模型
  //    userToken 必须带：工具在恢复执行时才真正调 mall-api
  const stream = await graph.stream(
    new Command({ resume: decision }),
    {
      streamMode: ["messages", "custom", "updates"],
      signal,
      configurable: { thread_id: conversationId, userToken: user.token },
    },
  );

  const parts: MessagePart[] = [];
  for await (const [, mode, chunk] of stream) {
    // 与 stream() 相同的三分支 fold（可抽成私有生成器复用）
    if (mode === "messages") {
      const [aiChunk, metadata] = chunk as [AIMessageChunk, { langgraph_node?: string }];
      if (metadata?.langgraph_node !== "model_request") continue;
      if (aiChunk._getType?.() !== "ai") continue;
      const content = aiChunk.content;
      if (typeof content !== "string" || content.length === 0) continue;
      pushText(parts, content);
      yield { type: "delta", conversationId, delta: content };
    } else if (mode === "custom") {
      const ev = chunk as { type?: string; name?: string; props?: unknown };
      if (ev?.type !== "component") continue;
      parts.push({ type: "component", name: ev.name!, props: (ev.props ?? {}) as Record<string, unknown> });
      yield { type: "component", conversationId, name: ev.name!, props: (ev.props ?? {}) as Record<string, unknown> };
    } else if (mode === "updates") {
      const item = (chunk as { __interrupt__?: Array<{ value: unknown }> }).__interrupt__?.[0];
      if (item) {
        const approval = item.value as RefundApprovalRequest;
        parts.push({ type: "approval", approval });
        yield { type: "approval", conversationId, approval };
      }
    }
  }

  // 5. 最终回复落库（拒绝场景模型会输出礼貌拒答，同样落库）
  if (parts.length > 0) {
    await insertMessage(conversationId, "assistant", parts);
  }
}
```

> 可选重构：5.5 的循环与 5.3 重复，可抽成 `private async *foldStream(stream, conversationId, parts)` 共用。

**验证点**：
- `graph.getState()` 能否读到嵌套子 agent 冒泡上来的 interrupt（父图 `state.tasks[].interrupts`）——Step 4 的 `checkpointer: true` 是前提
- resume 只重放 tools 节点：观察 resume 时模型不会重新输出审批前的文本

---

### Step 6 路由：新增 /api/chat/resume

**文件**：新建 `apps/ai/src/app/api/chat/resume/route.ts`（与现有 `chat/stream/route.ts` 同构）

```ts
import { z } from "zod";
import { parseJsonBody, sseResponse } from "@/lib/ai/http";
import { requireAuth } from "@/lib/ai/auth";
import { chatService } from "@/lib/ai/services/chat-service";

export const runtime = "nodejs";

const ResumeSchema = z.object({
  conversationId: z.string().uuid(),
  approved: z.boolean(),
  note: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.resp;

  const r = await parseJsonBody(req, ResumeSchema);
  if (!r.ok) return r.resp;

  return sseResponse(
    chatService.resume(
      r.data.conversationId,
      { approved: r.data.approved, note: r.data.note },
      auth.user,
      req.signal,
    ),
    { signal: req.signal },
  );
}
```

`/api/chat/stream/route.ts` **无需改动**（sseResponse 泛型透传新事件）；`/api/conversation/messages/route.ts` **无需改动**（select 已带 meta，jsonb 自动序列化）。

---

### Step 7 组件示例工具：compare_growth（打通 custom 通道）

**文件**：新建 `apps/ai/src/ai/tools/analysis.ts`；在 `apps/ai/src/ai/agents/normal.ts` 的 tools 数组挂载。

```ts
// apps/ai/src/ai/tools/analysis.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getWriter } from "@langchain/langgraph";

/**
 * 季度对比：双通道原则演示
 * - getWriter().write() → 前端（custom 流）：全量结构化数据，不过模型
 * - return → 模型（ToolMessage）：结论摘要，模型没有明细，画不出重复表格
 */
export const compareGrowth = tool(
  async ({ metric }) => {
    // TODO: 后续接 mall-api 真实统计接口；先用演示数据打通通道
    const data = {
      from: { label: "Q2", total: 100 },
      to: { label: "Q3", total: 123 },
      growth: 23,
      trend: [
        { month: "7月", value: 30 },
        { month: "8月", value: 41 },
        { month: "9月", value: 52 },
      ],
    };
    void metric;

    // 通道 1：给前端
    getWriter()?.write({ type: "component", name: "quarter_compare", props: data });

    // 通道 2：给模型
    return `季度对比图表已生成：${data.from.label} ${data.from.total} 万 → ${data.to.label} ${data.to.total} 万，环比 +${data.growth}%。请结合图表做简要解读，不要罗列明细数据。`;
  },
  {
    name: "compare_growth",
    description: "对比两个季度的经营指标并生成前端图表。用户询问季度环比、增长对比时使用。",
    schema: z.object({
      metric: z.string().optional().describe("指标名，如销售额；默认销售额"),
    }),
  },
);
```

```ts
// apps/ai/src/ai/agents/normal.ts —— tools 数组加一项
import { compareGrowth } from "../tools/analysis";
// ...
tools: [...现有工具, compareGrowth],
```

**关键验证点（Step 7 最大风险）**：`getWriter()` 在嵌套子图（supervisor → runAgent → normalAgent → tools）里能否把事件浮到父流。
验证方法：Step 5 完成后跑一次对比提问，在 `mode === "custom"` 分支加 `console.log(mode, chunk)`。**若无输出**，给 stream 选项加 `subgraphs: true`（三元组解构不变，`messages` 过滤逻辑也不受影响，反而能看到子 agent 的 model_request 文本）。

---

### 阶段二：前端（apps/web）

---

### Step 8 协议类型对齐

**文件**：`apps/web/src/api/ai/chat.ts`（整体替换）

```ts
/** 与后端 apps/ai/src/type/message-part.ts 对齐 */
export interface RefundApprovalRequest {
  reason: string;
  orderNo: string;
  amount: number;
}
export interface RefundApprovalDecision {
  approved: boolean;
  note?: string;
}
export type ApprovalStatus = "pending" | "resolved";
/** 前端渲染用的审批态（后端发请求字段，status 由 meta/本地补充） */
export interface ApprovalMeta extends RefundApprovalRequest {
  status: ApprovalStatus;
  approved?: boolean;
  note?: string | null;
}

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "approval"; approval: ApprovalMeta }
  | { type: "component"; name: string; props: Record<string, unknown> };

/** SSE 事件帧（http.ts sseResponse 异常帧 {error} 无 type，需兼容） */
export interface ChatStreamEvent {
  type?: "delta" | "component" | "approval" | "error";
  conversationId?: string;
  delta?: string;
  name?: string;
  props?: Record<string, unknown>;
  approval?: RefundApprovalRequest;
  error?: string;
}
```

**文件**：`apps/web/src/api/ai/conversation.ts` —— `ConversationMessage` 改为：

```ts
import type { MessagePart, ApprovalMeta } from "./chat";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: MessagePart[];                       // jsonb 数组
  meta?: { approval?: ApprovalMeta } | null;    // 新增
  createdAt: string;
}
```

---

### Step 9 use-chat-stream 改造（parts 累积 + resume 复用）

**文件**：`apps/web/src/hooks/use-chat-stream.ts`

**9.1 新增状态与辅助**

```ts
import type { BubbleItemType } from "@ant-design/x";
import type { ChatStreamEvent, MessagePart, ApprovalMeta, RefundApprovalDecision, RefundApprovalRequest } from "@/api/ai/chat";

// hook 内新增：
const partsRef = useRef<MessagePart[]>([]);

/** 把 parts 快照刷进指定 AI 气泡（不可变更新触发渲染） */
const flushParts = useCallback((aiKey: string) => {
  const snapshot = [...partsRef.current];
  setMessages((prev) =>
    prev.map((m) => (m.key === aiKey ? { ...m, loading: false, content: snapshot } : m)),
  );
}, []);

/** 重置累积器（新气泡开始前调用） */
const resetParts = useCallback(() => { partsRef.current = []; }, []);
```

**9.2 抽取 consumeStream（sendMessage 与 decideApproval 共用）**

```ts
/** 消费一条 SSE 响应：解析事件帧 → fold 进 partsRef → 刷新气泡 */
const consumeStream = useCallback(async (res: Response, aiKey: string) => {
  await readSse(res.body, (data) => {
    const ev = data as ChatStreamEvent;
    if (ev.error) throw new Error(ev.error);          // 兼容 sseResponse 异常帧（无 type）
    if (ev.type === "error") throw new Error(ev.error ?? "未知错误");

    if (ev.conversationId) {
      if (ev.conversationId !== conversationIdRef.current && !conversationIdRef.current) {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
      conversationIdRef.current = ev.conversationId;
      setConversationId(ev.conversationId);
    }

    switch (ev.type) {
      case "delta": {
        const parts = partsRef.current;
        const last = parts[parts.length - 1];
        if (last?.type === "text") {
          parts[parts.length - 1] = { type: "text", text: last.text + (ev.delta ?? "") };
        } else {
          parts.push({ type: "text", text: ev.delta ?? "" });
        }
        flushParts(aiKey);
        break;
      }
      case "component":
        partsRef.current.push({ type: "component", name: ev.name!, props: ev.props ?? {} });
        flushParts(aiKey);
        break;
      case "approval":
        partsRef.current.push({ type: "approval", approval: { ...ev.approval!, status: "pending" } });
        flushParts(aiKey);
        break;
      default:
        break;
    }
  });
}, [flushParts, queryClient]);
```

**9.3 sendMessage 改造**（替换 L118-234 的 fetch + readSse 段）

```ts
const sendMessage = useCallback(async (text: string) => {
  const trimmed = text.trim();
  if (!trimmed || loading) return;
  setLoading(true);

  const aiKey = `a-${Date.now()}`;
  setMessages((prev) => [
    ...prev,
    { key: `u-${Date.now()}`, role: "user", placement: "end", avatar: userAvatar, content: trimmed },
    { key: aiKey, role: "assistant", placement: "start", avatar: aiAvatar, loading: true, content: [] },
  ]);

  const controller = new AbortController();
  abortRef.current = controller;
  resetParts();

  try {
    const token = getToken();
    const res = await fetch("/api/ai/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ message: trimmed, conversationId: conversationIdRef.current }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    await consumeStream(res, aiKey);

    // 全程无内容（挂起轮至少有 approval part，不会走到这）
    if (partsRef.current.length === 0) {
      setMessages((prev) => prev.map((m) => (m.key === aiKey ? { ...m, loading: false, content: "（没有返回内容）" } : m)));
    }
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") return;
    setMessages((prev) => prev.map((m) => (m.key === aiKey ? { ...m, loading: false, content: `⚠️ ${err.message}` } : m)));
  } finally {
    setLoading(false);
    abortRef.current = null;
  }
}, [loading, userAvatar, aiAvatar, consumeStream, resetParts]);
```

> 挂起轮（approval 帧）会正常关闭 loading 并渲染卡片；「待审批期间发新消息」由后端守卫返回 error 帧提示。

**9.4 decideApproval（审批动作 → resume 流）**

```ts
/** 本地翻转旧卡片状态：找到含匹配 approval part 的气泡，把 status 改为 resolved */
const resolvePendingApprovalLocally = useCallback(
  (orderNo: string, decision: RefundApprovalDecision) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (!Array.isArray(m.content)) return m;
        return {
          ...m,
          content: (m.content as MessagePart[]).map((p) =>
            p.type === "approval" && p.approval.orderNo === orderNo && p.approval.status === "pending"
              ? { type: "approval", approval: { ...p.approval, status: "resolved", approved: decision.approved, note: decision.note ?? null } }
              : p,
          ),
        };
      }),
    );
  },
  [],
);

const decideApproval = useCallback(
  async (req: RefundApprovalRequest, approved: boolean, note?: string) => {
    if (loading || !conversationIdRef.current) return;
    setLoading(true);

    const decision: RefundApprovalDecision = { approved, note };
    const aiKey = `a-${Date.now()}`;
    // 旧卡片立即翻转为结果态
    resolvePendingApprovalLocally(req.orderNo, decision);
    // 追加决策留痕气泡 + 新 AI 占位气泡
    setMessages((prev) => [
      ...prev,
      { key: `u-${Date.now()}`, role: "user", placement: "end", avatar: userAvatar,
        content: `【审批】${approved ? "同意" : "拒绝"}退款${note ? `：${note}` : ""}` },
      { key: aiKey, role: "assistant", placement: "start", avatar: aiAvatar, loading: true, content: [] },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;
    resetParts();

    try {
      const token = getToken();
      const res = await fetch("/api/ai/chat/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ conversationId: conversationIdRef.current, approved, note }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      await consumeStream(res, aiKey);
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") return;
      setMessages((prev) => prev.map((m) => (m.key === aiKey ? { ...m, loading: false, content: `⚠️ ${err.message}` } : m)));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  },
  [loading, userAvatar, aiAvatar, consumeStream, resetParts, resolvePendingApprovalLocally],
);
```

**9.5 toBubbleItems（历史恢复，L52-62）**：content 直接透传 parts 数组，渲染交给 contentRender（Step 12）

```ts
const toBubbleItems = useCallback(
  (rows: ConversationMessage[]): BubbleItemType[] =>
    rows.map((m) => ({
      key: m.id,
      role: m.role,
      placement: m.role === "user" ? "end" : "start",
      avatar: m.role === "user" ? userAvatar : aiAvatar,
      content: m.content, // MessagePart[]（渲染在 contentRender 里做）
    })),
  [userAvatar, aiAvatar],
);
```

**9.6 返回值增加** `decideApproval`。

**待审批时禁用输入**（可选增强）：`messages` 里存在 `status === "pending"` 的 approval part 时，`chat.tsx` 的 Sender 置灰并提示「有待审批请求」。判断函数：

```ts
export function hasPendingApproval(messages: BubbleItemType[]): boolean {
  return messages.some(
    (m) => Array.isArray(m.content) && (m.content as MessagePart[]).some(
      (p) => p.type === "approval" && p.approval.status === "pending",
    ),
  );
}
```

---

### Step 10 ApprovalCard 组件

**文件**：新建 `apps/web/src/components/chat/ApprovalCard.tsx`

用 React Context 传递审批动作，避免 props 层层穿透（live 气泡和历史恢复两个渲染路径都能拿到）：

```tsx
import { createContext, useContext, useState } from "react";
import { Button, Input, Space, Tag, Typography } from "antd";
import type { ApprovalMeta, RefundApprovalDecision } from "@/api/ai/chat";

/** 审批动作由外层（chat.tsx）注入；未注入时按钮禁用 */
export const ApprovalActionContext = createContext<
  ((req: ApprovalMeta, approved: boolean, note?: string) => void) | null
>(null);

export function ApprovalCard({ approval }: { approval: ApprovalMeta }) {
  const onDecide = useContext(ApprovalActionContext);
  const [note, setNote] = useState("");
  const resolved = approval.status !== "pending";

  return (
    <div
      style={{
        border: "1px solid var(--color-line)",
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
        maxWidth: 380,
      }}
    >
      <Space direction="vertical" size={6} style={{ width: "100%" }}>
        <Space>
          <Tag color="orange">人工审批</Tag>
          <Typography.Text strong>退款审批请求</Typography.Text>
        </Space>
        <Typography.Text type="secondary">订单号：{approval.orderNo}</Typography.Text>
        <Typography.Text type="secondary">退款金额：¥{approval.amount}</Typography.Text>
        <Typography.Text type="secondary">原因：{approval.reason}</Typography.Text>
        {resolved ? (
          <Tag color={approval.approved ? "green" : "red"}>
            {approval.approved ? "已同意" : "已拒绝"}
            {approval.note ? `：${approval.note}` : ""}
          </Tag>
        ) : (
          <>
            <Input.TextArea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="审批备注（拒绝时建议填写原因）"
            />
            <Space>
              <Button type="primary" disabled={!onDecide} onClick={() => onDecide?.(approval, true, note)}>
                同意退款
              </Button>
              <Button danger disabled={!onDecide} onClick={() => onDecide?.(approval, false, note)}>
                拒绝
              </Button>
            </Space>
          </>
        )}
      </Space>
    </div>
  );
}
```

---

### Step 11 组件注册表 + 图表示例

**文件**：新建 `apps/web/src/components/chat/component-registry.tsx`

```tsx
import QuarterCompareChart from "./QuarterCompareChart";

/** 组件注册表：后端 component part 的 name → 前端组件。新图表类型在此登记 */
const registry: Record<string, React.FC<Record<string, unknown>>> = {
  quarter_compare: QuarterCompareChart,
};

export function renderComponent(name: string, props: Record<string, unknown>) {
  const Cmp = registry[name];
  return Cmp ? <Cmp {...props} /> : <div style={{ color: "#999" }}>未知组件：{name}</div>;
}
```

**文件**：新建 `apps/web/src/components/chat/QuarterCompareChart.tsx`（图表库安装见命令）

```bash
pnpm --filter web add @ant-design/charts
```

```tsx
import { Column } from "@ant-design/plots";

/** 季度对比图（props 与后端 compare_growth 工具 write 的 data 对齐） */
export default function QuarterCompareChart({
  from, to, growth, trend,
}: {
  from: { label: string; total: number };
  to: { label: string; total: number };
  growth: number;
  trend: { month: string; value: number }[];
}) {
  const data = [
    { label: from.label, value: from.total },
    { label: to.label, value: to.total },
  ];
  return (
    <div style={{ border: "1px solid var(--color-line)", borderRadius: 12, padding: 12, marginTop: 8, maxWidth: 420 }}>
      <b style={{ fontSize: 13 }}>季度对比：{from.label} → {to.label}（环比 +{growth}%）</b>
      <Column data={data} xField="label" yField="value" height={180} />
      <Column data={trend} xField="month" yField="value" height={140} />
    </div>
  );
}
```

> 不想装图表库：先用 antd `Table` / `Descriptions` 实现同 props 的表格版，通道验证不受影响。

---

### Step 12 renderParts + contentRender 接线

**文件**：新建 `apps/web/src/components/chat/render-parts.tsx`

```tsx
import { Fragment, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MessagePart } from "@/api/ai/chat";
import { ApprovalCard } from "./ApprovalCard";
import { renderComponent } from "./component-registry";

/** parts → ReactNode：文本走 Markdown，审批/组件查注册表。渲染顺序 = 数组顺序 */
export function renderParts(parts: MessagePart[]): ReactNode {
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "text") {
          return p.text ? (
            <div key={i} className="md-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.text}</ReactMarkdown>
            </div>
          ) : null;
        }
        if (p.type === "approval") return <ApprovalCard key={i} approval={p.approval} />;
        if (p.type === "component") return <Fragment key={i}>{renderComponent(p.name, p.props)}</Fragment>;
        return null;
      })}
    </>
  );
}
```

**文件**：`apps/web/src/routes/_admin/ai/chat.tsx`（改 L196-214 与 hook 接线）

```tsx
import { renderParts } from "@/components/chat/render-parts";
import { ApprovalActionContext } from "@/components/chat/ApprovalCard";
import type { MessagePart } from "@/api/ai/chat";

// hook 解构增加 decideApproval：
const { ..., decideApproval } = useChatStream({ ... });

// Bubble.List 包上 Context，contentRender 增加 parts 分支：
<ApprovalActionContext.Provider value={decideApproval}>
  <Bubble.List
    items={messages}
    role={{
      assistant: {
        contentRender: (content) =>
          Array.isArray(content) ? (
            renderParts(content as MessagePart[])
          ) : typeof content === "string" ? (
            <div className="md-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            content
          ),
      },
    }}
    styles={{ content: { fontSize: 13.5, lineHeight: 1.7 } }}
  />
</ApprovalActionContext.Provider>
```

> 历史恢复自动生效：`toBubbleItems` 透传 parts 数组 → `contentRender` 走 `renderParts` → 审批卡片按 meta 的 status 渲染为 pending（带按钮）或 resolved（结果标签）。**这就是"刷新页面仍停留在审批状态"的实现**。

---

## 四、验证清单（按顺序执行）

启动：`services/mall-api`(8080) → `apps/ai`(3001) → `apps/web`(5173)。

| # | 场景 | 预期 |
|---|------|------|
| 1 | 普通聊天（"你好"） | markdown 正常，行为与改造前一致 |
| 2 | 退单 ≤500 元 | 不挂起，直接退款成功回复 |
| 3 | 退单 >500 元 | 文本流 → 审批卡片出现（loading 关闭）；消息表该行 content 含 approval part、meta.status=pending |
| 4 | 待审批时发新消息 | error 帧：「当前会话有一笔退款待审批…」（可选：Sender 置灰） |
| 5 | 刷新页面 | 恢复历史：卡片仍为 pending 带按钮 |
| 6 | 点同意 | 旧卡片立即变「已同意」；追加【审批】留痕气泡；resume 流式输出退款成功回复；meta→resolved |
| 7 | 点拒绝（填原因） | resume 后模型礼貌拒答；刷新后卡片显示「已拒绝：原因」 |
| 8 | 双开标签页重复审批 | 第二次报「该审批已处理」（幂等闩生效） |
| 9 | "对比 Q2 和 Q3 的销售额" | 文本 → 图表组件 → 总结文本，三段同气泡；消息表 content 为三段 parts |
| 10 | 图表轮刷新恢复 | 图表按 meta 数据重渲染（数据驱动，非截图） |
| 11 | 重启 ai-service 后做 #6 | resume 依然可用（PostgresSaver 持久化 checkpoint） |
| 12 | abort 中断流 | 与现状一致：不落库 assistant |

后端联调前可先 curl 验证 SSE 协议：

```bash
curl -N -X POST http://localhost:3001/api/chat/stream \
  -H "Content-Type: application/json" -H "Authorization: Bearer <JWT>" \
  -d '{"message":"我要退掉 ORD20260910120000123100"}'
# 观察帧顺序：data: {"type":"delta",...} → data: {"type":"approval",...} → data: [DONE]
```

## 五、风险与边界（实施时重点核对）

1. **`getWriter()` 嵌套子图可见性**（Step 7 最大风险）：无事件 → stream 选项加 `subgraphs: true`
2. **`request.runtime?.configurable?.userToken`**（Step 4）：先 console.log 确认 MiddlewareRequest 的 runtime 结构
3. **interrupt 冒泡**（Step 5）：`graph.getState().tasks[].interrupts` 是否有值——`checkpointer: true` 必须先落地
4. **resume 重放安全**：interrupt 之后、`next(request)` 之前不要有写操作；金额查单是幂等读，重放无害
5. **会话归属**：stream/resume 都校验 `conv.userId === user.userId`（Step 5 已包含，stream 原代码缺失）
6. **meta 与 parts 的 approval 字段关系**：parts 里的 approval part 只存请求字段；status 一律以 meta 为准（历史渲染）/ 本地 state（live 渲染）
7. **挂起轮 title**：isNew 时 title 逻辑照常，不受影响
8. **纯文本消息零回归**：content 为 `[{type:"text"}]` 单段数组，渲染与旧 markdown 一致

## 六、建议实施顺序

```
Step 1 类型 → Step 2 迁移 → Step 3 repo
  → Step 4 refundAgent ──▶ 中间可测： interrupt 是否挂起（console/DB 观察）
  → Step 5 chat-service ──▶ 中间可测： curl 验证 SSE 三种帧
  → Step 6 resume 路由 → Step 7 工具
  → Step 8 前端类型 → Step 9 hook → Step 10 卡片 → Step 11 注册表 → Step 12 接线
  → 按第四节验证清单全量回归
```

每步独立可验证；Step 5 完成后即可用 curl 看到三种帧，前端可以后行。
