// src/agents/supervisor.ts
import { deepseekModel } from "@/model";
import { z } from "zod";

export type RouteCategory = "order" | "refund" | "complaint" | "general";

const RouteSchema = z.object({
  category: z
    .enum(["order", "refund", "complaint", "general"])
    .describe(
      "用户意图分类：order=订单查询；refund=退款；complaint=投诉；general=非客服类常识/闲聊",
    ),
  reasoning: z.string().describe("简要说明为什么这么分类"),
});

// deepseekModel 已关闭 thinking 且 temperature=0，可用 functionCalling 严格约束 schema
const supervisorModel = deepseekModel;

const structured = supervisorModel.withStructuredOutput(RouteSchema, {
  method: "functionCalling",
});

export async function route(
  messages: Array<{ role: string; content: string }>,
): Promise<{ category: RouteCategory; reasoning: string }> {
  try {
    const result = await structured.invoke([
      {
        role: "system",
        content:
          "你是客服分诊助手。请阅读用户最新一条消息，将其分类到以下四个类别之一：\n" +
          "- order：订单查询、物流跟踪、订单状态\n" +
          "- refund：退款、退货、退换货\n" +
          "- complaint：投诉、不满、差评\n" +
          "- general：与客服业务无关的常识、技术、闲聊问题\n\n" +
          "只允许输出 order、refund、complaint、general 四者之一，不得使用其他值。",
      },
      ...messages,
    ]);
    return result;
  } catch (error) {
    console.error("分诊失败错误supervisor:", error);
    // 兜底：解析失败时默认走 general（normalAgent），避免硬塞进客服分支污染回答
    return { category: "general", reasoning: "分诊解析失败，默认转通用对话" };
  }
}
