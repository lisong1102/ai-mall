import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { BubbleItemType } from "@ant-design/x";
import { readSse } from "@/lib/sse";
import type { ChatStreamEvent } from "@/api/ai/chat";
import { getToken } from "@/lib/auth-token";

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

  const conversationIdRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setLoading(true);

      const userKey = `u-${Date.now()}`;
      const aiKey = `a-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        {
          key: userKey,
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
          // Bubble 自带的打字占位：内容空时显示三个点
          loading: true,
          content: "",
        },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

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

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        // 累积 delta，逐帧 setMessages 触发 Bubble 重渲染
        let acc = "";
        let firstDelta = true;

        await readSse(res.body, (data) => {
          const ev = data as ChatStreamEvent;
          if (ev.error) throw new Error(ev.error);
          if (ev.conversationId) conversationIdRef.current = ev.conversationId;
          if (!ev.delta) return;

          acc += ev.delta;
          const snapshot = acc;
          setMessages((prev) =>
            prev.map((m) =>
              m.key === aiKey
                ? {
                    ...m,
                    // 第一帧 delta 到达后关闭 loading 占位
                    loading: false,
                    content: snapshot,
                  }
                : m,
            ),
          );
          firstDelta = false;
        });

        // 流结束但全程没有 delta：把占位气泡换成兜底文案
        if (firstDelta) {
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
    [loading, userAvatar, aiAvatar],
  );

  return { messages, loading, sendMessage };
}
