import { normalAgent } from "./langchain/normal";

/**
 * Agent 注册表：业务增多时在此登记。
 *
 * - 每个 agent 文件内部封装自己的 systemPrompt + tools（LangChain createAgent）
 * - service 按 conversation.agent_key 取对应 agent
 * - 新增 agent：写文件 → 在此登记 → ChatRequestSchema 的 agentKey 加枚举值
 * - LangChain only：所有 agent 都是 createAgent 出来的同类型对象，不额外抽象接口
 */
export const agents = {
  normal: normalAgent,
} as const;

export type AgentKey = keyof typeof agents;
export const DEFAULT_AGENT_KEY: AgentKey = "normal";

/** 按 key 取 agent；未知 key 抛错（service 上层 catch 转 422） */
export function getAgent(key: string) {
  const a = agents[key as AgentKey];
  if (!a) throw new Error(`未知 agent: ${key}`);
  return a;
}
