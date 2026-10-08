import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Avatar, Button, Tabs, Input } from "antd";
import { Bubble, Sender, Conversations } from "@ant-design/x";
import type { BubbleItemType, ConversationsProps } from "@ant-design/x";
import {
  RobotOutlined,
  PlusOutlined,
  SearchOutlined,
  CheckCircleFilled,
  BarChartOutlined,
  SafetyCertificateOutlined,
  FormOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { conversations } from "@/data/mock";
import { useChatStream } from "@/hooks/use-chat-stream";
import {
  aiAvatar,
  userAvatar,
  WELCOME_MESSAGE,
} from "@/components/chat/constants";
import ChatConversationList from "./-ChatConversationList";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const convItems: NonNullable<ConversationsProps["items"]> = conversations.map(
  (c) => ({
    key: c.id,
    label: c.title,
    description: c.preview,
  }),
);

export const Route = createFileRoute("/_admin/ai/chat")({
  component: AIChat,
});

function AIChat() {
  const [input, setInput] = useState("");
  const {
    messages,
    loading,
    conversationId,
    sendMessage,
    switchConversation,
    newConversation,
    deleteConversation,
  } = useChatStream({
    initialMessages: [WELCOME_MESSAGE],
    userAvatar,
    aiAvatar,
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: 14,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "var(--color-paper)",
          border: "1px solid var(--color-line)",
          borderRadius: "var(--radius-lg)",
          padding: "14px 18px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "var(--color-apricot)",
                boxShadow: "0 0 0 4px var(--color-apricot-soft)",
              }}
            />
            AI 工作台
          </h2>
          <div
            style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 2 }}
          >
            独立于右侧助手的深度 AI 会话 · 支持知识库、工具调用与多轮记忆
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "248px 1fr",
          gap: 14,
          minHeight: 0,
        }}
      >
        {/* Conversation list */}
        <ChatConversationList
          activeId={conversationId}
          onSelect={switchConversation}
          deleteConversation={deleteConversation}
          onNew={newConversation}
        />
        {/* Chat panel */}
        <div
          style={{
            background: "var(--color-paper)",
            border: "1px solid var(--color-line)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 18px",
              borderBottom: "1px solid var(--color-line-soft)",
            }}
          >
            <b style={{ fontSize: 14 }}>青风 Pro 商品文案优化</b>
            <div style={{ display: "flex", gap: 6, marginLeft: 10 }}>
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontWeight: 600,
                  background: "var(--color-jade-soft)",
                  color: "var(--color-jade-deep)",
                }}
              >
                已挂载知识库
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontWeight: 600,
                  background: "var(--color-apricot-soft)",
                  color: "var(--color-apricot-deep)",
                }}
              >
                工具调用已启用
              </span>
            </div>
            <div
              style={{
                marginLeft: "auto",
                fontSize: 11.5,
                color: "var(--color-ink-3)",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <SafetyCertificateOutlined /> 此会话长期记忆已开启
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 26px" }}>
            <Bubble.List
              items={messages}
              role={{
                assistant: {
                  contentRender: (content) =>
                    typeof content === "string" ? (
                      <div className="md-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      content
                    ),
                },
              }}
              styles={{ content: { fontSize: 13.5, lineHeight: 1.7 } }}
            />
          </div>

          <div
            style={{
              padding: "14px 18px 18px",
              borderTop: "1px solid var(--color-line-soft)",
              background: "#fcfdfb",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              {[
                { icon: <SafetyCertificateOutlined />, label: "挂载知识库" },
                { icon: <FormOutlined />, label: "选择工具" },
                { icon: <SafetyCertificateOutlined />, label: "长期记忆" },
              ].map((t) => (
                <Button
                  key={t.label}
                  size="small"
                  icon={t.icon}
                  style={{
                    borderRadius: 999,
                    borderColor: "var(--color-line)",
                    background: "#fff",
                    color: "var(--color-ink-2)",
                    fontWeight: 500,
                  }}
                >
                  {t.label}
                </Button>
              ))}
            </div>
            <div
              style={{
                background: "#f7faf8",
                border: "1px solid var(--color-line)",
                borderRadius: 15,
                padding: "10px 10px 10px 16px",
              }}
            >
              <Sender
                value={input}
                onChange={setInput}
                placeholder="输入消息，让茶茶帮你深度分析或生成内容…（Shift + Enter 换行）"
                submitType={loading ? "shiftEnter" : "enter"}
                onSubmit={() => {
                  if (!input.trim() || loading) return;
                  sendMessage(input);
                  setInput("");
                }}
                styles={{
                  input: { fontSize: 13.5 },
                  suffix: {
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: "linear-gradient(140deg, #f4a871, #e8854a)",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    boxShadow: "0 6px 14px -5px rgba(232,133,74,.7)",
                  },
                }}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--color-ink-3)",
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <SafetyCertificateOutlined style={{ fontSize: 12 }} />
              工作台会话与右侧「茶茶小助手」相互独立，互不干扰 · 内容由 AI
              生成，请核对后使用
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
