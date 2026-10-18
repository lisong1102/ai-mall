import { mallHttp } from "../http";
import type { CategoryShareItem, DailySales, DashboardSummary } from "./types";

/** 仪表盘汇总指标（今日 + 昨日对照 + 待处理售后） */
export async function getDashboardSummary() {
  const res = await mallHttp.get<DashboardSummary>("/dashboard/summary");
  return res.data;
}

/** 近 days 天销售趋势（含今天，无成交日期后端已补零） */
export async function getSalesTrend(days: number = 7) {
  const res = await mallHttp.get<DailySales[]>("/dashboard/sales-trend", {
    params: { days },
  });
  return res.data;
}

/** 类目销售占比（按销售额降序） */
export async function getCategoryShare() {
  const res = await mallHttp.get<CategoryShareItem[]>("/dashboard/category-share");
  return res.data;
}
