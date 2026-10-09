import { ToolLoopAgent, InferAgentUIMessage, tool, stepCountIs } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { z } from "zod";

// ─── 工具定义 ───────────────────────────────────────

/** 查询天气工具 */
export const weatherTool = tool({
  description: "Get the current weather in a location (fahrenheit)",
  inputSchema: z.object({
    location: z.string().describe("The location to get the weather for"),
  }),
  execute: async ({ location }) => {
    const temperature = Math.round(Math.random() * (90 - 32) + 32);
    const conditions = ["晴朗", "多云", "阴天", "小雨", "大风"][
      Math.floor(Math.random() * 5)
    ];
    return {
      location,
      temperature,
      conditions,
    };
  },
});

/** 华氏度转摄氏度工具 */
export const convertToCelsiusTool = tool({
  description: "Convert a temperature from fahrenheit to celsius",
  inputSchema: z.object({
    temperature: z
      .number()
      .describe("The temperature in fahrenheit to convert"),
  }),
  execute: async ({ temperature }) => {
    const celsius = Math.round((temperature - 32) * (5 / 9));
    return {
      fahrenheit: temperature,
      celsius,
    };
  },
});

// ─── Agent 定义 ──────────────────────────────────────

/**
 * 天气助手 Agent
 *
 * 可以查询天气、转换温度单位，支持多步 Tool Loop 自动执行
 */
export const weatherAgent = new ToolLoopAgent({
  model: deepseek("deepseek-v4-flash"),
  instructions:
    "你是一个专业的天气助手。你可以查询任意城市的当前天气（返回华氏温度），并将华氏温度转换为摄氏温度。当用户询问天气时，主动使用工具获取数据，并给出友好的回答。",
  tools: {
    getWeather: weatherTool,
    convertToCelsius: convertToCelsiusTool,
  },
  stopWhen: stepCountIs(10),
  onStepFinish: async ({ toolResults }) => {
    if (toolResults.length) {
      console.log(
        "[WeatherAgent] Step finished, tool results:",
        JSON.stringify(toolResults, null, 2),
      );
    }
  },
});

// ─── 类型导出（供前端 useChat 使用） ──────────────────

export type WeatherAgentUIMessage = InferAgentUIMessage<typeof weatherAgent>;
