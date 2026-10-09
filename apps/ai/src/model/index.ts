import { ChatOpenAI } from "@langchain/openai";

export const deepseekModel = new ChatOpenAI({
  model: "deepseek-v4-flash", // DeepSeek 支持的模型：deepseek-v4-pro 或 deepseek-v4-flash
  configuration: {
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.Deepseek_API_KEY,
  },
  temperature: 0,
  // 关闭 thinking 模式，否则 agent 绑定工具（tool_choice）会报错：
  // "Thinking mode does not support this tool_choice"
  // DeepSeek V4 新 API 用 thinking.type=disabled，旧的 enable_thinking 参数已失效
  modelKwargs: {
    thinking: { type: "disabled" },
  },
});

export const kimiModel = new ChatOpenAI({
  model: "kimi-k2.7-code",
  configuration: {
    baseURL: "https://api.moonshot.cn/v1",
    apiKey: process.env.Kimi_API_KEY,
  },
  temperature: 1,
  // 注意：kimi-k2.7-code 只允许 thinking.type=enabled、temperature=1，无法调整。
  // 因此不适合做严格的结构化输出（functionCalling 与 thinking 冲突），
  // 结构化分类请改用 deepseekModel。
});

export const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});
