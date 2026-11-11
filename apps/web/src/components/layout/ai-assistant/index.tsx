import { useState } from "react";
import { Bubble } from "@ant-design/x";
import AssistantHeader from "./assistant-header";
import AssistantFooter from "./assistant-footer";
import { WELCOME_MESSAGE, aiAvatar, userAvatar } from "../../chat/constants";
import { useChatStream } from "@/hooks/use-chat-stream";
import { renderParts } from "@/components/chat/render-parts";
import { MessagePart } from "@/api/ai/chat";
import MarkdownRenderer from "@/components/chat/MarkdownRenderer";

export default function AIAssistant() {
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
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(16px)",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <AssistantHeader
        activeId={conversationId}
        onSelect={switchConversation}
        deleteConversation={deleteConversation}
        onNew={newConversation}
      />

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        <Bubble.List
          items={messages}
          role={{
            assistant: {
              contentRender: (content) =>
                Array.isArray(content) ? (
                  renderParts(content as MessagePart[])
                ) : typeof content === "string" ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  content
                ),
            },
          }}
          styles={{
            content: { fontSize: 13, lineHeight: 1.65 },
          }}
        />
      </div>

      <AssistantFooter
        input={input}
        loading={loading}
        onInputChange={setInput}
        onSubmit={sendMessage}
      />
    </aside>
  );
}
