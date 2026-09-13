import { useState } from "react";
import { Avatar, Button } from "antd";
import { Bubble, Sender } from "@ant-design/x";
import type { BubbleItemType } from "@ant-design/x";
import {
  RobotOutlined,
  PlusOutlined,
  DownOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";

/** 工具调用卡片（自定义组件） */
function ToolCard({
  title,
  rows,
  api,
}: {
  title: string;
  rows: { label: string; value: string }[];
  api: string;
}) {
  return (
    <div
      style={{
        marginTop: 9,
        border: "1px solid var(--color-line)",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: "var(--color-apricot-soft)",
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--color-apricot-deep)",
        }}
      >
        <CheckCircleFilled style={{ fontSize: 14 }} />
        调用工具：{title}
        <span
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "var(--color-jade-deep)",
          }}
        >
          <CheckCircleFilled style={{ fontSize: 13 }} />
          成功
        </span>
      </div>
      <div style={{ padding: "11px 12px", fontSize: 12 }}>
        {rows.map((r) => (
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
            <b style={{ color: "var(--color-ink)", fontWeight: 600 }}>
              {r.value}
            </b>
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
            wordBreak: "break-all",
          }}
        >
          {api}
        </div>
      </div>
    </div>
  );
}

const aiAvatar = (
  <Avatar
    size={28}
    style={{
      background: "linear-gradient(140deg, #f6b27f, #e8854a)",
      borderRadius: 9,
    }}
    icon={<RobotOutlined style={{ fontSize: 15 }} />}
  />
);

const userAvatar = (
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

const messages: BubbleItemType[] = [
  {
    key: "m1",
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
          {["今天待处理的事项有哪些？", "帮我写「青风 Pro」的商品描述"].map(
            (t) => (
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
            ),
          )}
        </div>
      </div>
    ),
  },
  {
    key: "m2",
    role: "user",
    placement: "end",
    avatar: userAvatar,
    content: "帮我查一下订单 ORD202609120086 到哪了",
  },
  {
    key: "m3",
    role: "assistant",
    placement: "start",
    avatar: aiAvatar,
    content: (
      <div>
        已通过业务接口查到这笔订单：
        <ToolCard
          title="查询订单物流"
          rows={[
            { label: "客户", value: "林清晏" },
            { label: "商品", value: "青风 Pro 智能手机 等 2 件" },
            { label: "金额", value: "¥ 2,399.00" },
            { label: "物流", value: "顺丰 SF1388 2745 · 杭州转运中心已发出" },
          ]}
          api="GET /api/orders/order_no/ORD202609120086"
        />
        <div
          style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
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
            复制物流单号
          </Button>
          <Button
            size="small"
            style={{
              borderRadius: 999,
              borderColor: "#f3d2b8",
              color: "var(--color-apricot-deep)",
              fontWeight: 600,
            }}
          >
            通知客户已发货
          </Button>
        </div>
      </div>
    ),
  },
  {
    key: "m4",
    role: "user",
    placement: "end",
    avatar: userAvatar,
    content: "客户说想退货，能直接帮他发起售后吗？",
  },
  {
    key: "m5",
    role: "assistant",
    placement: "start",
    avatar: aiAvatar,
    status: "loading",
    content: (
      <div>
        该订单当前为「已发货」状态，符合退货退款条件。我将创建类型为
        <b>退货退款</b>的售后单，退款金额 <b>¥ 2,399.00</b>
        ，创建后进入待审核队列。
        <div
          style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
        >
          <Button
            size="small"
            type="primary"
            style={{
              borderRadius: 999,
              background: "var(--color-apricot)",
              fontWeight: 600,
            }}
          >
            确认创建售后单
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
            先查看客户历史
          </Button>
        </div>
      </div>
    ),
  },
];

export default function AIAssistant() {
  const [input, setInput] = useState("");

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
      {/* Header */}
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

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        <Bubble.List
          items={messages}
          styles={{
            content: { fontSize: 13, lineHeight: 1.65 },
          }}
        />
      </div>

      {/* Footer */}
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
          {["今日销售概况", "查缺货商品", "审核售后", "生成商品文案"].map(
            (q) => (
              <span
                key={q}
                style={{
                  fontSize: 11,
                  color: "var(--color-ink-2)",
                  background: "var(--color-line-soft)",
                  padding: "4px 10px",
                  borderRadius: 999,
                  cursor: "pointer",
                }}
              >
                {q}
              </span>
            ),
          )}
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
            onChange={setInput}
            placeholder="输入问题，或让茶茶帮你办业务…"
            submitType="enter"
            onSubmit={() => setInput("")}
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
    </aside>
  );
}
