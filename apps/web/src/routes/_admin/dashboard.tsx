import { createFileRoute } from "@tanstack/react-router";
import { Card, Tag, Button } from "antd";
import {
  DollarOutlined,
  FileTextOutlined,
  UserAddOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";
import {
  stats,
  salesBars,
  categoryShares,
  recentOrders,
  statusColorMap,
} from "@/data/mock";
import { useAssistantStore } from "@/store/use-assistant-store";

const statIconMap = {
  money: <DollarOutlined />,
  order: <FileTextOutlined />,
  user: <UserAddOutlined />,
  clock: <ClockCircleOutlined />,
};

const statColorMap = {
  jade: { bg: "var(--color-jade-soft)", color: "var(--color-jade-deep)" },
  sky: { bg: "var(--color-sky)", color: "var(--color-sky-deep)" },
  apricot: {
    bg: "var(--color-apricot-soft)",
    color: "var(--color-apricot-deep)",
  },
  gold: { bg: "#faf1dc", color: "#b98a1f" },
};

function HelloBanner() {
  const openAssistant = useAssistantStore((s) => s.openAssistant);
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--radius-lg)",
        background:
          "linear-gradient(112deg, #23996a 0%, #35b281 52%, #63c79a 100%)",
        color: "#fff",
        padding: "22px 26px",
        display: "flex",
        alignItems: "center",
        gap: 20,
        boxShadow: "0 16px 34px -18px rgba(30,138,94,.7)",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -60,
          top: -90,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,.22), transparent 68%)",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: "#fff" }}>
          早上好，管理员
        </h2>
        <p
          style={{
            fontSize: 13,
            opacity: 0.88,
            marginTop: 5,
            maxWidth: 420,
            marginBottom: 0,
          }}
        >
          今日成交 86 单，销售额 ¥12,846，另有 2
          笔售后待审核。需要处理的事，也可以直接交给右侧 AI 助手。
        </p>
      </div>
      <Button
        onClick={openAssistant}
        style={{
          marginLeft: "auto",
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(255,255,255,.16)",
          border: "1px solid rgba(255,255,255,.35)",
          padding: "10px 18px",
          borderRadius: 999,
          fontSize: 13.5,
          fontWeight: 600,
          color: "#fff",
          height: "auto",
        }}
      >
        <ThunderboltOutlined />
        问问 AI 助手
      </Button>
    </div>
  );
}

function StatCards() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 14,
        marginBottom: 16,
      }}
    >
      {stats.map((s) => {
        const c = statColorMap[s.color];
        return (
          <Card
            key={s.label}
            styles={{ body: { padding: "18px 20px" } }}
            style={{ borderRadius: "var(--radius-lg)" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 12.5, color: "var(--color-ink-2)" }}>
                {s.label}
              </span>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  display: "grid",
                  placeItems: "center",
                  background: c.bg,
                  color: c.color,
                }}
              >
                {statIconMap[s.icon]}
              </span>
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                margin: "12px 0 5px",
                letterSpacing: 0.5,
              }}
              className="num"
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--color-ink-3)",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {s.trendType === "up" ? (
                <span
                  style={{
                    color: "var(--color-jade-deep)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <ArrowUpOutlined style={{ fontSize: 10 }} /> {s.trend}
                </span>
              ) : (
                <span
                  style={{
                    color: "var(--color-apricot-deep)",
                    fontWeight: 600,
                  }}
                >
                  {s.trend}
                </span>
              )}
              <span>较昨日</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function SalesChart() {
  return (
    <Card
      styles={{ body: { padding: 20 } }}
      style={{ borderRadius: "var(--radius-lg)" }}
      title={
        <span style={{ fontSize: 15, fontWeight: 700 }}>近 7 日销售趋势</span>
      }
      extra={
        <div
          style={{
            display: "flex",
            background: "var(--color-line-soft)",
            borderRadius: 10,
            padding: 3,
          }}
        >
          <button
            style={{
              fontSize: 12,
              color: "var(--color-jade-deep)",
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: 8,
              border: "none",
              background: "#fff",
              boxShadow: "var(--shadow-sm)",
              cursor: "pointer",
            }}
          >
            近 7 天
          </button>
          <button
            style={{
              fontSize: 12,
              color: "var(--color-ink-2)",
              padding: "4px 12px",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            近 30 天
          </button>
        </div>
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 14,
          height: 178,
          paddingTop: 10,
        }}
      >
        {salesBars.map((bar) => (
          <div
            key={bar.label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              height: "100%",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 30,
                borderRadius: "8px 8px 5px 5px",
                height: `${bar.value}%`,
                background: bar.hot
                  ? "linear-gradient(180deg, #2ea776, #58bd8c)"
                  : "linear-gradient(180deg, #7fd4ac, #b9e8d0)",
              }}
            >
              {bar.amount && (
                <span
                  style={{
                    position: "absolute",
                    top: -20,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 10.5,
                    color: "var(--color-ink-2)",
                    whiteSpace: "nowrap",
                  }}
                  className="num"
                >
                  {bar.amount}
                </span>
              )}
            </div>
            <label style={{ fontSize: 11.5, color: "var(--color-ink-3)" }}>
              {bar.label}
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CategoryDonut() {
  const total = categoryShares.reduce((sum, c) => sum + c.percent, 0);
  const gradient = categoryShares
    .map((c, i) => {
      const start = categoryShares
        .slice(0, i)
        .reduce((s, x) => s + x.percent, 0);
      const end = start + c.percent;
      return `${c.color} ${(start / total) * 100}% ${(end / total) * 100}%`;
    })
    .join(", ");

  return (
    <Card
      styles={{ body: { padding: 20 } }}
      style={{ borderRadius: "var(--radius-lg)" }}
      title={
        <span style={{ fontSize: 15, fontWeight: 700 }}>类目销售占比</span>
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: "50%",
            flexShrink: 0,
            background: `conic-gradient(${gradient})`,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            style={{
              width: 92,
              height: 92,
              background: "#fff",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              textAlign: "center",
            }}
          >
            <div>
              <b style={{ fontSize: 19, display: "block" }} className="num">
                1,286
              </b>
              <span style={{ fontSize: 11, color: "var(--color-ink-3)" }}>
                总销量（件）
              </span>
            </div>
          </div>
        </div>
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 11 }}
        >
          {categoryShares.map((c) => (
            <div
              key={c.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontSize: 12.5,
                color: "var(--color-ink-2)",
              }}
            >
              <i
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 3,
                  flexShrink: 0,
                  background: c.color,
                }}
              />
              {c.name}
              <b
                style={{
                  marginLeft: "auto",
                  fontSize: 12.5,
                  color: "var(--color-ink)",
                }}
                className="num"
              >
                {c.percent}%
              </b>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function RecentOrders() {
  return (
    <Card
      styles={{ body: { padding: 0 } }}
      style={{ borderRadius: "var(--radius-lg)" }}
      title={<span style={{ fontSize: 15, fontWeight: 700 }}>最新订单</span>}
      extra={
        <a
          style={{
            fontSize: 12.5,
            color: "var(--color-jade-deep)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          查看全部 →
        </a>
      }
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["订单号", "客户", "金额", "状态", "下单时间", ""].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--color-ink-3)",
                  letterSpacing: 1,
                  padding: "0 20px 10px",
                  borderBottom: "1px solid var(--color-line-soft)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recentOrders.map((o) => (
            <tr key={o.orderNo} style={{ transition: "background .15s" }}>
              <td
                style={{
                  padding: "13px 20px",
                  fontSize: 13,
                  borderBottom: "1px solid var(--color-line-soft)",
                }}
                className="num"
              >
                {o.orderNo}
              </td>
              <td
                style={{
                  padding: "13px 20px",
                  fontSize: 13,
                  borderBottom: "1px solid var(--color-line-soft)",
                }}
              >
                {o.customer}
              </td>
              <td
                style={{
                  padding: "13px 20px",
                  fontSize: 13,
                  borderBottom: "1px solid var(--color-line-soft)",
                }}
                className="num"
              >
                {o.amount}
              </td>
              <td
                style={{
                  padding: "13px 20px",
                  fontSize: 13,
                  borderBottom: "1px solid var(--color-line-soft)",
                }}
              >
                <Tag
                  color={statusColorMap[o.status]}
                  style={{ borderRadius: 999 }}
                >
                  {o.status}
                </Tag>
              </td>
              <td
                style={{
                  padding: "13px 20px",
                  fontSize: 13,
                  borderBottom: "1px solid var(--color-line-soft)",
                  color: "var(--color-ink-3)",
                }}
                className="num"
              >
                {o.time}
              </td>
              <td
                style={{
                  padding: "13px 20px",
                  fontSize: 13,
                  borderBottom: "1px solid var(--color-line-soft)",
                  textAlign: "right",
                }}
              >
                <a
                  style={{
                    color: "var(--color-jade-deep)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  详情
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export const Route = createFileRoute("/_admin/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div>
      <HelloBanner />
      <StatCards />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.55fr 1fr",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <SalesChart />
        <CategoryDonut />
      </div>
      <RecentOrders />
    </div>
  );
}
