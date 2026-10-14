import { z } from "zod";
import { DEFAULT_AGENT_KEY, type AgentKey } from "@/ai/agents";
import { graph } from "@/ai/index";
import {
  createConversation,
  getConversation,
  insertMessage,
  resolveApprovalMeta,
  updateTitle,
} from "./conversation-repo";
import analysisChain from "@/ai/agents/conversationAgent";
import {
  ChatStreamEvent,
  MessagePart,
  RefundApprovalDecision,
  RefundApprovalRequest,
} from "@/type/message-part";
import { getPendingInterrupt } from "@/ai/interrupt";
import { Command } from "@langchain/langgraph";

/**
 * Chat 接口的请求 schema。
 * - message 必填，非空字符串
 * - conversationId 可选（首次对话无值，service 自动建会话）
 * - agentKey 可选，仅新建会话时生效；已有 conversation 以库中 agent_key 为准
 *   扩展新 agent 时：agents/index.ts 登记 + 此处 enum 加值
 *
 * 多传字段默认被 zod 静默丢弃；如需严格拒绝，加 `.strict()`。
 */
export const ChatRequestSchema = z.object({
  message: z.string().min(1, "消息不能为空"),
  conversationId: z.string().uuid().optional(),
  agentKey: z.enum(["normal"]).optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/** 调用方（route 层）解析 JWT 后传入的用户身份 */
export interface ChatUser {
  userId: string;
  username: string;
  /** 用户 JWT，透传进 LangChain configurable，供工具调用 mall-api 时携带 */
  token: string;
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
}

/** 首条 user 消息截 N 字作 conversation.title */
const TITLE_LIMIT = 30;

/** parts 组装：text 就地追加（连续文本合一段），其余新开一段。service/前端同一套规则 */
function pushText(parts: MessagePart[], text: string) {
  const last = parts[parts.length - 1];
  if (last?.type === "text") last.text += text;
  else parts.push({ type: "text", text });
}

// 固定 TStreamMode 实例化，拿多模式流的 [mode, payload] 元组联合类型；
// 直接 ReturnType<typeof graph.stream> 会按默认重载退化为 state 对象、丢元组
type AgentStream = Awaited<
  ReturnType<
    typeof graph.stream<["messages", "custom", "updates"], false, undefined>
  >
>;

/**
 * 消费 agent 流（stream / resume 共用），单次顺序遍历按 mode 分类 fold：
 * - messages → model_request 的 AI 文本 delta（pushText 连续文本合一段）+ delta 事件
 * - updates → __interrupt__ 审批请求 → approval part + approval 事件
 * - custom → 工具写入的组件事件 → component part + component 事件
 * parts 由调用方传入、就地填充；结束后由调用方 persistAssistantParts 落库。
 */
async function* consumeAgentStream(
  stream: AgentStream,
  conversationId: string,
  parts: MessagePart[],
): AsyncGenerator<ChatStreamEvent> {
  for await (const block of stream) {
    const [mode, payload] = block;
    if (mode === "messages") {
      const [chunk, metadata] = payload;
      if (metadata?.langgraph_node !== "model_request") continue;
      if (chunk._getType?.() !== "ai") continue;
      const content = chunk.content;
      if (typeof content !== "string" || content.length === 0) continue;
      pushText(parts, content);
      yield { type: "delta", conversationId, delta: content };
    } else if (mode === "updates") {
      const item = (payload as { __interrupt__: Array<{ value: unknown }> })
        .__interrupt__?.[0];
      if (item) {
        const value = item.value as RefundApprovalRequest;
        parts.push({
          type: "approval",
          approval: value,
        });
        yield { type: "approval", conversationId, approval: value };
      }
    } else if (mode === "custom") {
      // 工具经 getWriter() 写入的自定义事件 → component part（前端注册表按 name 渲染）
      const ev = payload as {
        type?: string;
        name?: string;
        props?: Record<string, unknown>;
      };
      if (ev?.type === "component" && ev.name) {
        const props = ev.props ?? {};
        parts.push({ type: "component", name: ev.name, props });
        yield { type: "component", conversationId, name: ev.name, props };
      }
    }
  }
}

/** 整轮 parts 一次性落库（原子）；含 approval part 时写 pending meta 作幂等闩 */
async function persistAssistantParts(
  conversationId: string,
  parts: MessagePart[],
) {
  if (parts.length === 0) throw new Error("AI 未返回内容");
  const approvalPart = parts.find(
    (p): p is Extract<MessagePart, { type: "approval" }> =>
      p.type === "approval",
  );
  await insertMessage(
    conversationId,
    "assistant",
    parts,
    approvalPart
      ? { approval: { status: "pending", ...approvalPart.approval } }
      : undefined,
  );
}

/**
 * Chat 业务编排入口（route 层只调它）。
 *
 * 流程：
 * 1. 解析 / 新建 conversation（带 agent_key 绑定）
 * 2. 拉短期记忆（历史 messages）
 * 3. 存 user message（先进库，避免丢）
 * 4. 调对应 agent 的 compiled graph（LangChain createAgent）
 * 5. 流式累加 delta：yield 给前端 + 拼到 assistantBuffer
 * 6. 正常结束：存 assistant message + 首条消息更新 title
 *    abort / 异常：不落库 assistant（前端已显示 ⚠️，不污染历史）
 *
 * userId 由 route 层从 JWT 解析后传入。
 */
export const chatService = {
  async send(input: ChatRequest, user: ChatUser): Promise<ChatResponse> {
    // 非流式：复用 stream 累加，避免编排逻辑重复
    let reply = "";
    let conversationId = "";
    for await (const ev of this.stream(input, user)) {
      if (ev.type === "delta") {
        conversationId = ev.conversationId;
        reply += ev.delta;
      }
    }
    return { conversationId, reply };
  },

  async *stream(
    input: ChatRequest,
    user: ChatUser,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent> {
    // ── 1. 解析 / 新建 conversation ───────────────────────
    // 会话id
    let conversationId: string;
    // agent模型key
    let agentKey: AgentKey;
    // 是否新会话
    let isNew = false;
    // 会话标题
    let title: string;

    // 会话管理
    if (input.conversationId) {
      const conv = await getConversation(input.conversationId);
      if (!conv) throw new Error("会话不存在");
      conversationId = conv.id;
      agentKey = conv.agentKey as AgentKey;
      title = conv.title;
    } else {
      const key = (input.agentKey ?? DEFAULT_AGENT_KEY) as AgentKey;
      // 会话标题：总结会话内容
      const result = await analysisChain.invoke({ input: input.message });
      title = result.reply;
      const conv = await createConversation(user.userId, key, title);
      conversationId = conv.id;
      agentKey = key;
      isNew = true;
    }

    //interrupt守卫，如果会话里面存在待恢复的 interrupt，先返回
    const interrupt = await getPendingInterrupt(conversationId, graph);
    if (interrupt) {
      throw new Error("会话存在待恢复中断");
    }

    // ── 3. 存 user message（先落库，避免丢）───────────────
    await insertMessage(conversationId, "user", [
      { type: "text", text: input.message },
    ]);

    // ── 4. 启动 agent 流 ──────────────────────────────────
    // signal 透传：前端断开时，LangChain 会中断到模型/工具的底层请求，不继续烧 token
    const stream = await graph.stream(
      { messages: [{ role: "user", content: input.message }] },
      {
        streamMode: ["messages", "custom", "updates"],
        signal,
        configurable: {
          thread_id: conversationId,
          // 透传用户 JWT，LangChain 工具经 mallServerFetch 携带鉴权
          userToken: user.token,
        },
      },
    );

    // ── 5. 消费流：fold parts + 透传事件 ─────────────────────
    const parts: MessagePart[] = [];
    //`yield*` 是`for-await` +`yield` 的语法糖
    yield* consumeAgentStream(stream, conversationId, parts);

    // ── 6. 整轮 parts 原子落库 ──────────────────────────────
    await persistAssistantParts(conversationId, parts);
    if (isNew && title === "新对话") {
      await updateTitle(conversationId, input.message.slice(0, TITLE_LIMIT));
    }
  },

  async *resume(
    conversationId: string,
    decision: RefundApprovalDecision,
    user: ChatUser,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent> {
    const conv = await getConversation(conversationId);
    if (!conv || conv.userId !== user.userId) throw new Error("会话不存在");

    // 2. 幂等闩：meta 翻转失败说明已被处理（双开标签页/重复点击）
    const ok = await resolveApprovalMeta(conversationId, decision);
    if (!ok) throw new Error("该审批已处理，请刷新页面");
    if (!(await getPendingInterrupt(conversationId, graph))) {
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
    const stream = await graph.stream(new Command({ resume: decision }), {
      streamMode: ["messages", "custom", "updates"],
      signal,
      configurable: { thread_id: conversationId, userToken: user.token },
    });

    // 5. 消费流：fold parts + 透传事件；6. 原子落库（resume 可能再触发新 interrupt）
    const parts: MessagePart[] = [];
    yield* consumeAgentStream(stream, conversationId, parts);
    // 6.落库
    await persistAssistantParts(conversationId, parts);
  },
};
