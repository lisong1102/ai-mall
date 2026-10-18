import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, Tag, Button, Spin } from "antd";
import {
  DollarOutlined,
  FileTextOutlined,
  UserAddOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  getDashboardSummary,
  getSalesTrend,
  getCategoryShare,
  pageOrders,
  getEnums,
  type DashboardSummary,
  type CategoryShareItem,
} from "@/api/mall";
import { useAssistantStore } from "@/store/use-assistant-store";
import { useAuth } from "@/lib/auth";

/** 金额：千分位，无小数（统计卡片/横幅用） */
const fmtMoney = (n: number) =>
  n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
/** 金额：千分位 + 两位小数（订单表格用） */
const fmtMoney2 = (n: number) =>
  n.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** 环比：返回文案与涨跌方向；昨日为 0 时今日有值记 +100% */
function pctTrend(
  today: number,
  yesterday: number,
): { text: string; up: boolean } {
  if (yesterday <= 0) {
    return { text: today > 0 ? "+100%" : "0%", up: true };
  }
  const p = ((today - yesterday) / yesterday) * 100;
  return { text: `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`, up: p >= 0 };
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

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

function HelloBanner({ summary }: { summary?: DashboardSummary }) {
  const openAssistant = useAssistantStore((s) => s.openAssistant);
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
  const pending = summary?.pendingAfterSales ?? 0;
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
          {greeting}，{user?.nickname ?? "管理员"}
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
          今日成交 {summary?.todayOrders ?? 0} 单，销售额 ¥
          {fmtMoney(summary?.todaySales ?? 0)}，
          {pending > 0 ? `另有 ${pending} 笔售后待审核` : "售后已全部处理"}
          。需要处理的事，也可以直接交给右侧 AI 助手。
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

interface StatCardItem {
  label: string;
  value: string;
  trend: string;
  up: boolean;
  icon: keyof typeof statIconMap;
  color: keyof typeof statColorMap;
}

function StatCards({
  summary,
  loading,
}: {
  summary?: DashboardSummary;
  loading: boolean;
}) {
  const stats: StatCardItem[] = useMemo(() => {
    const s = summary;
    const salesTrend = pctTrend(s?.todaySales ?? 0, s?.yesterdaySales ?? 0);
    const ordersTrend = pctTrend(s?.todayOrders ?? 0, s?.yesterdayOrders ?? 0);
    const customerDiff =
      (s?.newCustomers ?? 0) - (s?.yesterdayNewCustomers ?? 0);
    const pending = s?.pendingAfterSales ?? 0;
    return [
      {
        label: "今日销售额",
        value: `¥ ${fmtMoney(s?.todaySales ?? 0)}`,
        trend: salesTrend.text,
        up: salesTrend.up,
        icon: "money",
        color: "jade",
      },
      {
        label: "今日订单",
        value: String(s?.todayOrders ?? 0),
        trend: ordersTrend.text,
        up: ordersTrend.up,
        icon: "order",
        color: "sky",
      },
      {
        label: "新增客户",
        value: String(s?.newCustomers ?? 0),
        trend: `${customerDiff >= 0 ? "+" : ""}${customerDiff}`,
        up: customerDiff >= 0,
        icon: "user",
        color: "apricot",
      },
      {
        label: "待处理售后",
        value: String(pending),
        trend: pending > 0 ? "需尽快审核" : "已全部处理",
        up: false,
        icon: "clock",
        color: "gold",
      },
    ];
  }, [summary]);

  return (
    <Spin spinning={loading}>
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
                {s.up ? (
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
                ) : s.label === "待处理售后" ? (
                  <span
                    style={{
                      color: "var(--color-apricot-deep)",
                      fontWeight: 600,
                    }}
                  >
                    {s.trend}
                  </span>
                ) : (
                  <span
                    style={{
                      color: "var(--color-apricot-deep)",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <ArrowDownOutlined style={{ fontSize: 10 }} /> {s.trend}
                  </span>
                )}
                {s.label !== "待处理售后" && <span>较昨日</span>}
              </div>
            </Card>
          );
        })}
      </div>
    </Spin>
  );
}

/** 紧凑金额标签：≥1k 显示 ¥12.8k，否则原值 */
function compactAmount(n: number): string {
  return n >= 1000 ? `¥${(n / 1000).toFixed(1)}k` : `¥${fmtMoney(n)}`;
}

function SalesChart() {
  const [days, setDays] = useState<7 | 30>(7);
  const { data: trend, isLoading } = useQuery({
    queryKey: ["dashboard", "sales-trend", days],
    queryFn: () => getSalesTrend(days),
  });

  const bars = useMemo(() => {
    const list = trend ?? [];
    const max = Math.max(0, ...list.map((t) => t.amount));
    return list.map((t, i) => {
      const d = dayjs(t.date);
      const isToday = i === list.length - 1;
      return {
        key: t.date,
        // 7 天视图显示星期，30 天视图稀疏显示 M/D
        label:
          days === 7
            ? isToday
              ? "今日"
              : WEEKDAYS[d.day()]
            : i % 5 === 4 || isToday
              ? d.format("M/D")
              : "",
        // 有成交时保留最小高度避免看不见；hot 标记最高峰
        value:
          max > 0
            ? Math.max(Math.round((t.amount / max) * 100), t.amount > 0 ? 4 : 0)
            : 0,
        hot: max > 0 && t.amount === max,
        amount: compactAmount(t.amount),
      };
    });
  }, [trend, days]);

  const toggleBtn = (active: boolean): CSSProperties => ({
    fontSize: 12,
    color: active ? "var(--color-jade-deep)" : "var(--color-ink-2)",
    fontWeight: active ? 600 : 400,
    padding: "4px 12px",
    borderRadius: 8,
    border: "none",
    background: active ? "#fff" : "transparent",
    boxShadow: active ? "var(--shadow-sm)" : "none",
    cursor: "pointer",
  });

  return (
    <Card
      styles={{ body: { padding: 20 } }}
      style={{ borderRadius: "var(--radius-lg)" }}
      title={
        <span style={{ fontSize: 15, fontWeight: 700 }}>
          近 {days} 日销售趋势
        </span>
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
          <button style={toggleBtn(days === 7)} onClick={() => setDays(7)}>
            近 7 天
          </button>
          <button style={toggleBtn(days === 30)} onClick={() => setDays(30)}>
            近 30 天
          </button>
        </div>
      }
    >
      <Spin spinning={isLoading}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: days === 7 ? 14 : 4,
            height: 178,
            paddingTop: 10,
          }}
        >
          {bars.map((bar) => (
            <div
              key={bar.key}
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
                  maxWidth: days === 7 ? 30 : 14,
                  borderRadius: "8px 8px 5px 5px",
                  height: `${bar.value}%`,
                  background: bar.hot
                    ? "linear-gradient(180deg, #2ea776, #58bd8c)"
                    : "linear-gradient(180deg, #7fd4ac, #b9e8d0)",
                }}
              >
                {bar.hot && bar.value > 0 && (
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
              <label
                style={{
                  fontSize: 11.5,
                  color: "var(--color-ink-3)",
                  whiteSpace: "nowrap",
                }}
              >
                {bar.label}
              </label>
            </div>
          ))}
        </div>
      </Spin>
    </Card>
  );
}

/** 环图配色：按金额降序循环取色，最后一格固定浅灰绿给“其他” */
const DONUT_COLORS = ["#2ea776", "#4d93a3", "#7cc99f", "#e3b044", "#d9e5df"];

function CategoryDonut() {
  const { data: shares, isLoading } = useQuery({
    queryKey: ["dashboard", "category-share"],
    queryFn: getCategoryShare,
  });

  const { slices, totalQty } = useMemo(() => {
    const list = shares ?? [];
    // 取前 4 个类目，其余聚合为“其他”，保持环图可读性
    const top = list.slice(0, 4);
    const rest = list.slice(4);
    const merged: CategoryShareItem[] = [...top];
    if (rest.length > 0) {
      merged.push({
        categoryName: "其他",
        amount: rest.reduce((s, x) => s + x.amount, 0),
        quantity: rest.reduce((s, x) => s + x.quantity, 0),
      });
    }
    const totalAmount = merged.reduce((s, x) => s + x.amount, 0);
    return {
      slices: merged.map((c, i) => ({
        name: c.categoryName,
        percent: totalAmount > 0 ? (c.amount / totalAmount) * 100 : 0,
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      })),
      totalQty: merged.reduce((s, x) => s + x.quantity, 0),
    };
  }, [shares]);

  const gradient = slices
    .map((c, i) => {
      const start = slices.slice(0, i).reduce((s, x) => s + x.percent, 0);
      const end = start + c.percent;
      return `${c.color} ${start}% ${end}%`;
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
      <Spin spinning={isLoading}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 132,
              height: 132,
              borderRadius: "50%",
              flexShrink: 0,
              background:
                slices.length > 0
                  ? `conic-gradient(${gradient})`
                  : "var(--color-line-soft)",
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
                  {totalQty.toLocaleString("zh-CN")}
                </b>
                <span style={{ fontSize: 11, color: "var(--color-ink-3)" }}>
                  总销量（件）
                </span>
              </div>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 11,
            }}
          >
            {slices.length === 0 && (
              <span style={{ fontSize: 12.5, color: "var(--color-ink-3)" }}>
                暂无销售数据
              </span>
            )}
            {slices.map((c) => (
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
                  {Math.round(c.percent)}%
                </b>
              </div>
            ))}
          </div>
        </div>
      </Spin>
    </Card>
  );
}

function RecentOrders() {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "dashboard-recent"],
    queryFn: () => pageOrders({ page: 1, size: 4 }),
  });
  // 订单状态字典由后端统一下发，枚举低频变更故整会话缓存
  const { data: enums } = useQuery({
    queryKey: ["enums", "order_status"],
    queryFn: () => getEnums(["order_status"]),
    staleTime: Infinity,
  });
  const statusMap = useMemo(
    () =>
      Object.fromEntries(
        (enums?.order_status ?? []).map((o) => [o.code, o]),
      ) as Record<number, { label: string; color: string | null }>,
    [enums],
  );

  const records = data?.records ?? [];

  return (
    <Card
      styles={{ body: { padding: 0 } }}
      style={{ borderRadius: "var(--radius-lg)" }}
      title={<span style={{ fontSize: 15, fontWeight: 700 }}>最新订单</span>}
      extra={
        <Link
          to="/orders"
          style={{
            fontSize: 12.5,
            color: "var(--color-jade-deep)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          查看全部 →
        </Link>
      }
    >
      <Spin spinning={isLoading}>
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
            {records.length === 0 && !isLoading && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: "28px 20px",
                    fontSize: 12.5,
                    color: "var(--color-ink-3)",
                    textAlign: "center",
                  }}
                >
                  暂无订单
                </td>
              </tr>
            )}
            {records.map((o) => (
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
                  {o.customerName ?? "—"}
                </td>
                <td
                  style={{
                    padding: "13px 20px",
                    fontSize: 13,
                    borderBottom: "1px solid var(--color-line-soft)",
                  }}
                  className="num"
                >
                  ¥ {fmtMoney2(o.totalAmount)}
                </td>
                <td
                  style={{
                    padding: "13px 20px",
                    fontSize: 13,
                    borderBottom: "1px solid var(--color-line-soft)",
                  }}
                >
                  <Tag
                    color={statusMap[o.status]?.color ?? undefined}
                    style={{ borderRadius: 999 }}
                  >
                    {statusMap[o.status]?.label ?? o.status}
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
                  {dayjs(o.createdAt).format("MM-DD HH:mm")}
                </td>
                <td
                  style={{
                    padding: "13px 20px",
                    fontSize: 13,
                    borderBottom: "1px solid var(--color-line-soft)",
                    textAlign: "right",
                  }}
                >
                  <Link
                    to="/orders"
                    search={{ orderNo: o.orderNo }}
                    style={{
                      color: "var(--color-jade-deep)",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    详情
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Spin>
    </Card>
  );
}

export const Route = createFileRoute("/_admin/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: getDashboardSummary,
  });

  return (
    <div>
      <HelloBanner summary={summary} />
      <StatCards summary={summary} loading={isLoading} />
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
