import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import z from "zod";

export const conversationModel = new ChatOpenAI({
  model: "deepseek-v4-flash", // DeepSeek 支持的模型：deepseek-v4-pro 或 deepseek-v4-flash
  configuration: {
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.Deepseek_API_KEY,
  },
  temperature: 0,
  // 关闭 thinking 模式，否则 withStructuredOutput(functionCalling) 会报错
  // DeepSeek V4 新 API 用 thinking.type=disabled，旧的 enable_thinking 参数已失效
  modelKwargs: {
    thinking: { type: "disabled" },
  },
});

const ConversationSchema = z.object({
  reply: z.string().max(20).describe("总结的会话内容"),
});

const analysisChain = ChatPromptTemplate.fromMessages([
  ["system", "你是一个专业的助手，能够回答用户的问题。"],
  ["human", "{input}"],
]).pipe(
  conversationModel.withStructuredOutput(ConversationSchema, {
    method: "functionCalling",
  }),
);

export default analysisChain;
