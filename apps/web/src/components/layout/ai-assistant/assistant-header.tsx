import { Avatar } from "antd";
import { RobotOutlined, PlusOutlined, DownOutlined } from "@ant-design/icons";

/** 茶茶助手顶部栏：身份信息 + 连接状态 + 操作按钮 */
export default function AssistantHeader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "16px 18px",
        borderBottom: "1px solid var(--color-line-soft)",
        background:
          "linear-gradient(120deg, rgba(253,238,225,.7), rgba(255,255,255,0) 60%)",
      }}
    >
      <Avatar
        size={38}
        style={{
          background: "linear-gradient(140deg, #f6b27f, #e8854a)",
          borderRadius: 12,
          boxShadow: "var(--shadow-apricot)",
        }}
        icon={<RobotOutlined style={{ fontSize: 19 }} />}
      />
      <div>
        <b style={{ fontSize: 14, display: "block" }}>茶茶 · AI 运营助手</b>
        <div
          style={{
            fontSize: 11,
            color: "var(--color-ink-3)",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--color-jade)",
              boxShadow: "0 0 0 3px var(--color-jade-soft)",
            }}
          />
          已连接 mall-api · 可查订单 / 办售后
        </div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
        <button
          style={{
            padding: 7,
            borderRadius: 9,
            border: "none",
            background: "transparent",
            color: "var(--color-ink-3)",
            cursor: "pointer",
          }}
        >
          <PlusOutlined />
        </button>
        <button
          style={{
            padding: 7,
            borderRadius: 9,
            border: "none",
            background: "transparent",
            color: "var(--color-ink-3)",
            cursor: "pointer",
          }}
        >
          <DownOutlined />
        </button>
      </div>
    </div>
  );
}
