import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getWriter } from "@langchain/langgraph";

/**
 * 季度对比：双通道原则演示
 * - getWriter().write() → 前端（custom 流）：全量结构化数据，不过模型
 * - return → 模型（ToolMessage）：结论摘要，模型没有明细，画不出重复表格
 */
export const compareGrowth = tool(
  async ({ metric }) => {
    // TODO: 后续接 mall-api 真实统计接口；先用演示数据打通通道
    const data = {
      from: { label: "Q2", total: 100 },
      to: { label: "Q3", total: 123 },
      growth: 23,
      trend: [
        { month: "7月", value: 30 },
        { month: "8月", value: 41 },
        { month: "9月", value: 52 },
      ],
    };
    void metric;

    // 通道 1：给前端
    getWriter()?.write({
      type: "component",
      name: "quarter_compare",
      props: data,
    });

    // 通道 2：给模型
    return `季度对比图表已生成：${data.from.label} ${data.from.total} 万 → ${data.to.label} ${data.to.total} 万，环比 +${data.growth}%。请结合图表做简要解读，不要罗列明细数据。`;
  },
  {
    name: "compare_growth",
    description:
      "对比两个季度的经营指标并生成前端图表。用户询问季度环比、增长对比时使用。",
    schema: z.object({
      metric: z.string().optional().describe("指标名，如销售额；默认销售额"),
    }),
  },
);
