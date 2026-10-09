import { kimiModel } from "@/model";
import { createAgent } from "langchain";
import { queryOrder } from "../tools";

export const orderAgent = createAgent({
  name: "orderAgent",
  model: kimiModel,
  tools: [queryOrder],
  systemPrompt: `你是订单专员。职责：根据用户消息识别订单号，调用 query_order 工具查询，再用中文复述结果。
规则：
- 订单号格式为 O- 开头，如 O-1001
- 如果用户没给订单号，先反问引导用户提供
- 物流信息一定要包含承运商和单号
- 不要伪造任何订单数据`,
});
