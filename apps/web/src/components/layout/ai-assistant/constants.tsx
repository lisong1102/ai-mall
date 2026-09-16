import { Avatar } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import type { BubbleItemType } from "@ant-design/x";

export const aiAvatar = (
  <Avatar
    size={28}
    style={{
      background: "linear-gradient(140deg, #f6b27f, #e8854a)",
      borderRadius: 9,
    }}
    icon={<RobotOutlined style={{ fontSize: 15 }} />}
  />
);

export const userAvatar = (
  <Avatar
    size={28}
    style={{
      background: "linear-gradient(140deg, #58bd8c, #23996a)",
      borderRadius: 9,
      fontSize: 11,
      fontWeight: 600,
    }}
  >
    管
  </Avatar>
);

/** 欢迎语里的引导提问 */
export const WELCOME_PROMPTS = [
  "今天待处理的事项有哪些？",
  "帮我写「青风 Pro」的商品描述",
];

/** 输入框上方的快捷提问 */
export const QUICK_PROMPTS = [
  "今日销售概况",
  "查缺货商品",
  "审核售后",
  "生成商品文案",
];

/**
 * 初始欢迎消息——其余消息全部由用户真实输入 + 后端流式回复产生，
 * 避免演示数据和真实对话混杂。
 */
export const WELCOME_MESSAGE: BubbleItemType = {
  key: "m-welcome",
  role: "assistant",
  placement: "start",
  avatar: aiAvatar,
  content: (
    <div>
      早上好，我是茶茶 🍃 今天有 <b>2 笔售后待审核</b>、<b>1 件商品缺货</b>
      。你可以直接让我查订单、核库存或起草商品文案。
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 10,
        }}
      >
        {WELCOME_PROMPTS.map((t) => (
          <button
            key={t}
            style={{
              textAlign: "left",
              fontSize: 12,
              color: "var(--color-ink-2)",
              border: "1px dashed #c9ddd3",
              borderRadius: 11,
              padding: "9px 12px",
              background: "rgba(255,255,255,0.6)",
              cursor: "pointer",
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  ),
};
