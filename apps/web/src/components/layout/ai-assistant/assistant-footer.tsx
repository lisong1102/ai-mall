import { Sender } from "@ant-design/x";
import { QUICK_PROMPTS } from "../../chat/constants";

interface AssistantFooterProps {
  input: string;
  loading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

/** 茶茶助手底部：快捷提问 + 输入框 */
export default function AssistantFooter({
  input,
  loading,
  onInputChange,
  onSubmit,
}: AssistantFooterProps) {
  // 与原组件行为一致：空白内容或请求进行中不发送，成功发起后清空输入框
  const handleSubmit = (value: string) => {
    if (!value.trim() || loading) return;
    onSubmit(value);
    onInputChange("");
  };

  return (
    <div
      style={{
        padding: "12px 16px 16px",
        borderTop: "1px solid var(--color-line-soft)",
        background: "rgba(255,255,255,0.7)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 7,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        {QUICK_PROMPTS.map((q) => (
          <span
            key={q}
            onClick={() => handleSubmit(q)}
            style={{
              fontSize: 11,
              color: "var(--color-ink-2)",
              background: "var(--color-line-soft)",
              padding: "4px 10px",
              borderRadius: 999,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {q}
          </span>
        ))}
      </div>
      <div
        style={{
          background: "#f7faf8",
          border: "1px solid var(--color-line)",
          borderRadius: 14,
          padding: "9px 10px 9px 14px",
        }}
      >
        <Sender
          value={input}
          onChange={onInputChange}
          placeholder="输入问题，或让茶茶帮你办业务…"
          submitType="enter"
          loading={loading}
          onSubmit={handleSubmit}
          styles={{
            input: { fontSize: 13 },
            suffix: {
              width: 36,
              height: 36,
              borderRadius: 11,
              background: "linear-gradient(140deg, #f4a871, #e8854a)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              boxShadow: "0 6px 14px -5px rgba(232,133,74,.7)",
            },
          }}
        />
      </div>
    </div>
  );
}
