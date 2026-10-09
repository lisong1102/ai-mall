import { kimiModel } from "@/model";
import { createAgent } from "langchain";
import { createTicket } from "../tools";

export const complaintAgent = createAgent({
  name: "complaintAgent",
  model: kimiModel,
  tools: [createTicket],
  systemPrompt: `你是投诉专员。要求：
1. 先表达共情和歉意（一句话即可，不要油腻）
2. 调用 create_ticket 创建高优先级工单
3. 告知用户工单号和预期处理时间
`,
});
