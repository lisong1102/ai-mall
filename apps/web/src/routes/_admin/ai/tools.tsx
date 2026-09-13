import { createFileRoute } from "@tanstack/react-router";
import { Card } from "antd";
import {
  FormOutlined,
  BarChartOutlined,
  UserOutlined,
  MessageOutlined,
  SyncOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { aiTools } from "@/data/mock";

const iconMap = {
  pen: <FormOutlined />,
  chart: <BarChartOutlined />,
  user: <UserOutlined />,
  msg: <MessageOutlined />,
  refresh: <SyncOutlined />,
  more: <AppstoreOutlined />,
};

const colorMap = {
  apricot: { bg: "var(--color-apricot-soft)", color: "var(--color-apricot-deep)" },
  jade: { bg: "var(--color-jade-soft)", color: "var(--color-jade-deep)" },
  sky: { bg: "var(--color-sky)", color: "var(--color-sky-deep)" },
};

export const Route = createFileRoute("/_admin/ai/tools")({
  component: AITools,
});

function AITools() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, background: "var(--color-paper)", border: "1px solid var(--color-line)", borderRadius: "var(--radius-lg)", padding: "14px 18px", boxShadow: "var(--shadow-sm)" }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--color-apricot)", boxShadow: "0 0 0 4px var(--color-apricot-soft)" }} />
            智能工具
          </h2>
          <div style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 2 }}>预置的 AI 能力集合，一键调用，无需对话</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {aiTools.map((t) => {
          const c = colorMap[t.color];
          return (
            <Card
              key={t.title}
              styles={{ body: { padding: 20 } }}
              style={{ borderRadius: "var(--radius-lg)", cursor: "pointer", transition: "all .18s" }}
              hoverable
            >
              <div style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", marginBottom: 12, background: c.bg, color: c.color }}>
                {iconMap[t.icon]}
              </div>
              <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>{t.title}</h3>
              <p style={{ fontSize: 12.5, color: "var(--color-ink-3)", margin: 0 }}>{t.desc}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
