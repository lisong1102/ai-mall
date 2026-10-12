import { Column } from "@ant-design/plots";

/** 季度对比图（props 与后端 compare_growth 工具 write 的 data 对齐） */
export default function QuarterCompareChart({
  from,
  to,
  growth,
  trend,
}: {
  from: { label: string; total: number };
  to: { label: string; total: number };
  growth: number;
  trend: { month: string; value: number }[];
}) {
  const data = [
    { label: from.label, value: from.total },
    { label: to.label, value: to.total },
  ];
  return (
    <div
      style={{
        border: "1px solid var(--color-line)",
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
        maxWidth: 420,
      }}
    >
      <b style={{ fontSize: 13 }}>
        季度对比：{from.label} → {to.label}（环比 +{growth}%）
      </b>
      <Column data={data} xField="label" yField="value" height={180} />
      <Column data={trend} xField="month" yField="value" height={140} />
    </div>
  );
}
