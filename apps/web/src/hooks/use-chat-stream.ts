import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { BubbleItemType } from "@ant-design/x";
import { readSse } from "@/lib/sse";
import type {
  ChatStreamEvent,
  MessagePart,
  RefundApprovalDecision,
  RefundApprovalRequest,
} from "@/api/ai/chat";
import {
  listConversationMessages,
  deleteConversationById,
  type ConversationMessage,
} from "@/api/ai/conversation";
import { getToken } from "@/lib/auth-token";
import { useQueryClient } from "@tanstack/react-query";

interface UseChatStreamOptions {
  /** 初始消息（如欢迎语气泡） */
  initialMessages: BubbleItemType[];
  /** 用户气泡头像 */
  userAvatar: ReactNode;
  /** AI 气泡头像 */
  aiAvatar: ReactNode;
}

/**
 * 茶茶助手的聊天状态管理：
 * - messages：消息列表，发送时追加用户/AI 占位气泡，流式帧逐字更新 AI 气泡；
 * - loading：请求进行中；
 * - conversationId：跨请求保留，让后端续上短期记忆（拉历史 message）；
 * - abort：用户切走/取消时 abort，后端 signal 会停止 LangChain 流，省 token。
 */
export function useChatStream({
  initialMessages,
  userAvatar,
  aiAvatar,
}: UseChatStreamOptions) {
  const [messages, setMessages] = useState<BubbleItemType[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  // 当前会话 id（undefined = 未开始的新会话），头部下拉高亮依赖它
  const [conversationId, setConversationId] = useState<string | undefined>(
    undefined,
  );
  const queryClient = useQueryClient();
  const conversationIdRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const partsRef = useRef<MessagePart[]>([]); // 累积的 MessagePart 列表

  /** 中断正在进行的请求（切会话/新建时调用，省 token） */
  const abortRequest = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  /** 后端历史消息 → Bubble 项，头像/位置与实时发送的消息保持一致 */
  const toBubbleItems = useCallback(
    (rows: ConversationMessage[]): BubbleItemType[] =>
      rows.map((m) => {
        // 审批状态只落在 meta.approval（part 本身不带 status），恢复历史时
        // 合并回对应 part，否则已审批卡片刷新后会重新显示为待审批
        const metaApproval = m.meta?.approval;
        return {
          key: m.id,
          role: m.role,
          placement: m.role === "user" ? "end" : "start",
          avatar: m.role === "user" ? userAvatar : aiAvatar,
          // user 气泡无 contentRender，history 回来的 parts 数组会被当 children
          // 渲染而报 "Objects are not valid as a React child"，这里还原成纯文本
          content:
            m.role === "user"
              ? m.content
                  .filter((p) => p.type === "text")
                  .map((p) => p.text)
                  .join("")
              : metaApproval
                ? m.content.map((p) =>
                    p.type === "approval" &&
                    p.approval.orderNo === metaApproval.orderNo
                      ? {
                          type: "approval" as const,
                          approval: { ...p.approval, ...metaApproval },
                        }
                      : p,
                  )
                : m.content,
        };
      }),
    [userAvatar, aiAvatar],
  );

  /** 开新会话：中断请求 + 清空历史 + 回到欢迎语 */
  const newConversation = useCallback(() => {
    abortRequest();
    window.history.replaceState({}, "", window.location.pathname);
    conversationIdRef.current = undefined;
    setConversationId(undefined);
    setMessages(initialMessages);
    setLoading(false);
  }, [abortRequest, initialMessages]);

  /** 切换到指定会话：中断当前请求，拉该会话历史恢复气泡 */
  const switchConversation = useCallback(
    async (id: string) => {
      if (id === conversationIdRef.current) return;
      // 切换会话时，中断当前请求，省 token
      abortRequest();
      // 切换会话，替换或者新增浏览器的会话id
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?conversationId=${id}`,
      );

      conversationIdRef.current = id;
      setConversationId(id);
      setLoading(true);
      try {
        const rows = await listConversationMessages(id);
        setMessages(rows.length > 0 ? toBubbleItems(rows) : initialMessages);
      } catch {
        setMessages(initialMessages);
      } finally {
        setLoading(false);
      }
    },
    [abortRequest, toBubbleItems, initialMessages],
  );

  /** 删除历史会话 */
  const deleteConversation = useCallback(
    async (id: string) => {
      if (id === conversationIdRef.current) {
        newConversation();
      }
      abortRequest();
      try {
        await deleteConversationById(id);
      } catch {
        // 忽略错误
      }
    },
    [switchConversation],
  );

  /** 刷新 AI 气泡内容，合并所有 MessagePart 到一个字符串 */
  const flushParts = useCallback((aiKey: string) => {
    const snapshot = [...partsRef.current];
    setMessages((prev) =>
      prev.map((m) =>
        m.key === aiKey ? { ...m, loading: false, content: snapshot } : m,
      ),
    );
  }, []);

  /** 重置累积器（新气泡开始前调用） */
  const resetParts = useCallback(() => {
    partsRef.current = [];
  }, []);

  /** 消费一条 SSE 响应：解析事件帧 → fold 进 partsRef → 刷新气泡 */
  const consumeStream = useCallback(
    async (res: Response, aiKey: string) => {
      await readSse(res.body!, (data) => {
        const ev = data as ChatStreamEvent;
        if (ev.error) throw new Error(ev.error); // 兼容 sseResponse 异常帧（无 type）
        if (ev.type === "error") throw new Error(ev.error ?? "未知错误");

        if (ev.conversationId) {
          if (
            ev.conversationId !== conversationIdRef.current &&
            !conversationIdRef.current
          ) {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }
          conversationIdRef.current = ev.conversationId;
          setConversationId(ev.conversationId);
        }

        switch (ev.type) {
          case "delta": {
            const parts = partsRef.current;
            const last = parts[parts.length - 1];
            //如果最后一条是text，就合并到它后面
            // 否则，直接添加新 MessagePart
            if (last?.type === "text") {
              parts[parts.length - 1] = {
                type: "text",
                text: last.text + (ev.delta ?? ""),
              };
            } else {
              parts.push({ type: "text", text: ev.delta ?? "" });
            }
            flushParts(aiKey);
            break;
          }
          case "component":
            partsRef.current.push({
              type: "component",
              name: ev.name!,
              props: ev.props ?? {},
            });
            flushParts(aiKey);
            break;
          case "approval":
            partsRef.current.push({
              type: "approval",
              approval: { ...ev.approval!, status: "pending" },
            });
            flushParts(aiKey);
            break;
          default:
            break;
        }
      });
    },
    [flushParts, queryClient],
  );

  /** 发送消息：触发新气泡，发送请求，消费响应，刷新气泡 */
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setLoading(true);

      const aiKey = `a-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          key: `u-${Date.now()}`,
          role: "user",
          placement: "end",
          avatar: userAvatar,
          content: trimmed,
        },
        {
          key: aiKey,
          role: "assistant",
          placement: "start",
          avatar: aiAvatar,
          loading: true,
          content: [],
        },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      resetParts();

      try {
        const token = getToken();
        const res = await fetch("/api/ai/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: trimmed,
            conversationId: conversationIdRef.current,
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        await consumeStream(res, aiKey);

        // 全程无内容（挂起轮至少有 approval part，不会走到这）
        if (partsRef.current.length === 0) {
          setMessages((prev) =>
            prev.map((m) =>
              m.key === aiKey
                ? { ...m, loading: false, content: "（没有返回内容）" }
                : m,
            ),
          );
        }
      } catch (e) {
        const err = e as Error;
        if (err.name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.key === aiKey
              ? { ...m, loading: false, content: `⚠️ ${err.message}` }
              : m,
          ),
        );
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [loading, userAvatar, aiAvatar, consumeStream, resetParts],
  );

  /** 本地翻转旧卡片状态：找到含匹配 approval part 的气泡，把 status 改为 resolved */
  const resolvePendingApprovalLocally = useCallback(
    (orderNo: string, decision: RefundApprovalDecision) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (!Array.isArray(m.content)) return m;
          return {
            ...m,
            content: (m.content as MessagePart[]).map((p) =>
              p.type === "approval" &&
              p.approval.orderNo === orderNo &&
              p.approval.status === "pending"
                ? {
                    type: "approval",
                    approval: {
                      ...p.approval,
                      status: "resolved",
                      approved: decision.approved,
                      note: decision.note ?? null,
                    },
                  }
                : p,
            ),
          };
        }),
      );
    },
    [],
  );

  /** 决策退款审批：本地翻转旧卡片状态 + 追加决策留痕气泡 + 新 AI 占位气泡 */
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
        {
          key: `u-${Date.now()}`,
          role: "user",
          placement: "end",
          avatar: userAvatar,
          content: `【审批】${approved ? "同意" : "拒绝"}退款${note ? `：${note}` : ""}`,
        },
        {
          key: aiKey,
          role: "assistant",
          placement: "start",
          avatar: aiAvatar,
          loading: true,
          content: [],
        },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      resetParts();

      try {
        const token = getToken();
        const res = await fetch("/api/ai/chat/resume", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            conversationId: conversationIdRef.current,
            approved,
            note,
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        await consumeStream(res, aiKey);
      } catch (e) {
        const err = e as Error;
        if (err.name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.key === aiKey
              ? { ...m, loading: false, content: `⚠️ ${err.message}` }
              : m,
          ),
        );
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [
      loading,
      userAvatar,
      aiAvatar,
      consumeStream,
      resetParts,
      resolvePendingApprovalLocally,
    ],
  );

  function hasPendingApproval(messages: BubbleItemType[]): boolean {
    return messages.some(
      (m) =>
        Array.isArray(m.content) &&
        (m.content as MessagePart[]).some(
          (p) => p.type === "approval" && p.approval.status === "pending",
        ),
    );
  }

  /** 页面刷新时从 URL 恢复会话：URL 携带 conversationId 则拉历史记录 */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("conversationId");
    if (id && id !== conversationIdRef.current) {
      switchConversation(id);
    }
    // 仅在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    messages,
    loading,
    conversationId,
    sendMessage,
    switchConversation,
    newConversation,
    deleteConversation,
    decideApproval,
    hasPendingApproval,
  };
}
