import { ChatOpenAI } from "@langchain/openai";

export const deepseekModel = new ChatOpenAI({
  model: "deepseek-v4-flash", // DeepSeek 支持的模型：deepseek-v4-pro 或 deepseek-v4-flash
  configuration: {
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.Deepseek_API_KEY,
  },
  temperature: 0,
  // 关闭 thinking 模式，否则 withStructuredOutput(functionCalling) 会报错：
  // "Thinking mode does not support this tool_choice"
  modelKwargs: {
    enable_thinking: false,
  },
});

export const kimiModel = new ChatOpenAI({
  model: "kimi-k2.7-code",
  configuration: {
    baseURL: "https://api.moonshot.cn/v1",
    apiKey: process.env.Kimi_API_KEY,
  },
  temperature: 1,
});

export const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});
