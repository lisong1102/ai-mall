import type { ComponentType } from "react";
import QuarterCompareChart from "./QuarterCompareChart";
import OrderListSummaryCard from "./OrderListSummaryCard";

/** 组件注册表：后端 component part 的 name → 前端组件。新图表类型在此登记 */
const registry: Record<string, ComponentType<Record<string, unknown>>> = {
  // props 由后端 JSON 运行时下发，与各组件的具体 props 类型只能在此单点断言对齐
  quarter_compare: QuarterCompareChart as ComponentType<
    Record<string, unknown>
  >,
  order_list_summary: OrderListSummaryCard as ComponentType<
    Record<string, unknown>
  >,
};

export function renderComponent(name: string, props: Record<string, unknown>) {
  const Cmp = registry[name];
  return Cmp ? (
    <Cmp {...props} />
  ) : (
    <div style={{ color: "#999" }}>未知组件：{name}</div>
  );
}
