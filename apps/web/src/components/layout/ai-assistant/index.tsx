import { useState } from "react";
import { Bubble } from "@ant-design/x";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AssistantHeader from "./assistant-header";
import AssistantFooter from "./assistant-footer";
import { WELCOME_MESSAGE, aiAvatar, userAvatar } from "../../chat/constants";
import { useChatStream } from "@/hooks/use-chat-stream";

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
