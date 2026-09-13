import { Input, Badge } from "antd";
import { SearchOutlined, SyncOutlined, BellOutlined } from "@ant-design/icons";

interface TopbarProps {
  title: string;
}

export default function Topbar({ title }: TopbarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "4px 6px 16px",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 21,
            fontWeight: 700,
            letterSpacing: 0.3,
            margin: 0,
          }}
        >
          {title}
        </h1>
        <div style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 1 }}>
          2026 年 9 月 12 日 · 星期六 · 愿今天的订单像茶水一样源源不断
        </div>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <Input
          prefix={<SearchOutlined style={{ color: "var(--color-ink-3)" }} />}
          placeholder="搜索订单号 / 商品 / 客户…"
          style={{
            width: 268,
            background: "rgba(255,255,255,0.8)",
            borderRadius: 12,
          }}
        />
        <button
          title="同步数据"
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: "rgba(255,255,255,0.8)",
            border: "1px solid var(--color-line)",
            color: "var(--color-ink-2)",
            cursor: "pointer",
          }}
        >
          <SyncOutlined style={{ fontSize: 17 }} />
        </button>
        <Badge dot offset={[-2, 2]}>
          <button
            title="通知"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "rgba(255,255,255,0.8)",
              border: "1px solid var(--color-line)",
              color: "var(--color-ink-2)",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <BellOutlined style={{ fontSize: 17 }} />
          </button>
        </Badge>
      </div>
    </div>
  );
}
