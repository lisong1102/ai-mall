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

const aiAvatar = (
  <Avatar
    size={32}
    style={{
      background: "linear-gradient(140deg, #f6b27f, #e8854a)",
      borderRadius: 10,
    }}
    icon={<RobotOutlined style={{ fontSize: 17 }} />}
  />
);
const userAvatar = (
  <Avatar
    size={32}
    style={{
      background: "linear-gradient(140deg, #58bd8c, #23996a)",
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 600,
    }}
  >
    管
  </Avatar>
);

const chatMessages: BubbleItemType[] = [
  {
    key: "c1",
    role: "assistant",
    placement: "start",
    avatar: aiAvatar,
    content: (
      <div>
        我是茶茶，已为你挂载「商品运营知识库」并启用工具调用。可以帮你：生成/优化商品文案、分析卖点、对比竞品、一键上架。你想先优化哪款商品？
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
            marginTop: 14,
          }}
        >
          {[
            {
              icon: <FormOutlined />,
              color: "var(--color-apricot)",
              bg: "var(--color-apricot-soft)",
              title: "商品文案生成",
              desc: "输入商品参数，自动产出标题、卖点与详情描述",
            },
            {
              icon: <BarChartOutlined />,
              color: "var(--color-jade-deep)",
              bg: "var(--color-jade-soft)",
              title: "销售数据分析",
              desc: "自然语言查询销售趋势、类目占比与异常波动",
            },
            {
              icon: <UserOutlined />,
              color: "var(--color-sky-deep)",
              bg: "var(--color-sky)",
              title: "客户画像洞察",
              desc: "分析客户分层，给出精准运营与复购建议",
            },
          ].map((c) => (
            <div
              key={c.title}
              style={{
                border: "1px solid var(--color-line)",
                borderRadius: 13,
                padding: 14,
                background: "#fbfdfc",
                cursor: "pointer",
                transition: "all .18s",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 10,
                  background: c.bg,
                  color: c.color,
                }}
              >
                {c.icon}
              </div>
              <b style={{ fontSize: 13, display: "block", marginBottom: 3 }}>
                {c.title}
              </b>
              <span
                style={{
                  fontSize: 11.5,
                  color: "var(--color-ink-3)",
                  lineHeight: 1.5,
                }}
              >
                {c.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    key: "c2",
    role: "user",
    placement: "end",
    avatar: userAvatar,
    content:
      "帮我优化「青风 Pro 智能手机 256G」的商品卖点，突出影像和续航，语气年轻一点。",
  },
  {
    key: "c3",
    role: "assistant",
    placement: "start",
    avatar: aiAvatar,
    content: (
      <div>
        好的，我先从商品库读取该 SKU
        的基础参数，再结合知识库中的「年轻用户偏好」生成文案。
        <div
          style={{
            marginTop: 12,
            border: "1px solid var(--color-line)",
            borderRadius: 13,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 13px",
              background: "var(--color-apricot-soft)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-apricot-deep)",
            }}
          >
            <CheckCircleFilled style={{ fontSize: 14 }} />
            调用工具：查询商品详情
            <span
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "var(--color-jade-deep)",
              }}
            >
              <CheckCircleFilled style={{ fontSize: 13 }} /> 成功
            </span>
          </div>
          <div style={{ padding: 13, fontSize: 12.5 }}>
            {[
              { label: "SKU", value: "QF-PRO-256" },
              { label: "主摄", value: "5000 万像素 · OIS 光学防抖" },
              { label: "电池", value: "5500mAh · 100W 超级快充" },
              { label: "屏幕", value: "6.7″ 1.5K 120Hz 护眼屏" },
            ].map((r) => (
              <div
                key={r.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 0",
                  color: "var(--color-ink-2)",
                }}
              >
                <span>{r.label}</span>
                <b style={{ color: "var(--color-ink)" }}>{r.value}</b>
              </div>
            ))}
            <div
              style={{
                marginTop: 7,
                fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
                fontSize: 10.5,
                color: "var(--color-sky-deep)",
                background: "var(--color-sky)",
                borderRadius: 7,
                padding: "5px 8px",
              }}
            >
              GET /api/mall/products/sku/QF-PRO-256
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "c4",
    role: "assistant",
    placement: "start",
    avatar: aiAvatar,
    status: "loading",
    content: (
      <div>
        基于参数和知识库，为你生成 3 版卖点文案：
        <br />
        <br />
        <b>版本 A（影像向）：</b>「5000 万超清主摄 + OIS
        防抖，夜色里的每一拍都清晰到犯规。1.5K 护眼屏，刷剧久了也不累。」
        <br />
        <br />
        <b>版本 B（续航向）：</b>「5500mAh 大电池，重度使用一整天还有电。100W
        快充，洗个脸的功夫回血一半。」
        <br />
        <br />
        <b>版本 C（综合向）：</b>「影像、续航、屏幕全拉满，256G
        大存储随便造。年轻人的第一台旗舰，就该这么卷。」
        <div
          style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}
        >
          <Button
            size="small"
            style={{
              borderRadius: 999,
              borderColor: "#cfe7da",
              color: "var(--color-jade-deep)",
              fontWeight: 600,
            }}
          >
            采用 A
          </Button>
          <Button
            size="small"
            type="primary"
            style={{
              borderRadius: 999,
              background: "var(--color-apricot)",
              fontWeight: 600,
            }}
          >
            采用 C 并上架
          </Button>
          <Button
            size="small"
            style={{
              borderRadius: 999,
              borderColor: "#cfe7da",
              color: "var(--color-jade-deep)",
              fontWeight: 600,
            }}
          >
            再生成一版
          </Button>
        </div>
      </div>
    ),
  },
];

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
  const [activeKey, setActiveKey] = useState("1");
  const [input, setInput] = useState("");

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
        <Tabs
          defaultActiveKey="chat"
          style={{ marginLeft: 20 }}
          items={[
            { key: "chat", label: "对话助手" },
            { key: "knowledge", label: "知识库" },
            { key: "tools", label: "智能工具" },
          ]}
        />
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 9,
            background: "var(--color-apricot-soft)",
            border: "1px solid #f3d2b8",
            borderRadius: 10,
            padding: "6px 12px",
            fontSize: 12.5,
            color: "var(--color-apricot-deep)",
            fontWeight: 600,
          }}
        >
          <RobotOutlined />
          茶茶 · DeepSeek-R1
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
        <div
          style={{
            background: "var(--color-paper)",
            border: "1px solid var(--color-line)",
            borderRadius: "var(--radius-lg)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{
              background: "linear-gradient(140deg, #f6b27f, #e8854a)",
              border: "none",
              borderRadius: 11,
              height: 38,
              fontWeight: 600,
              boxShadow: "0 6px 14px -5px rgba(232,133,74,.6)",
            }}
          >
            新建会话
          </Button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginTop: 10,
              background: "#f7faf8",
              border: "1px solid var(--color-line)",
              borderRadius: 10,
              padding: "7px 10px",
              color: "var(--color-ink-3)",
            }}
          >
            <SearchOutlined style={{ fontSize: 14 }} />
            <Input
              placeholder="搜索历史会话…"
              variant="borderless"
              style={{ fontSize: 12.5 }}
            />
          </div>
          <div style={{ flex: 1, overflowY: "auto", marginTop: 10 }}>
            {["today", "yesterday"].map((g) => (
              <div key={g}>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--color-ink-3)",
                    letterSpacing: 1,
                    padding: "10px 8px 5px",
                  }}
                >
                  {g === "today" ? "今天" : "昨天"}
                </div>
                <Conversations
                  activeKey={activeKey}
                  onActiveChange={setActiveKey}
                  items={convItems.filter(
                    (c) =>
                      conversations.find((x) => x.id === c.key)?.group === g,
                  )}
                />
              </div>
            ))}
          </div>
        </div>

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
              items={chatMessages}
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
                submitType="enter"
                onSubmit={() => setInput("")}
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
