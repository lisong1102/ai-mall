import { OrderToolRuntime } from "@/type";
import { RunnableConfig } from "@langchain/core/runnables";

/**
 * 工具运行时上下文（订单 + 知识库共用）。
 * 由 chat-service 从 JWT 解析后透传进 LangChain configurable。
 */
export interface ToolRuntime extends OrderToolRuntime {
  userId?: string;
}

// 从 LangChain configurable 提取鉴权上下文
function getRuntime(config?: RunnableConfig): ToolRuntime {
  const c = config?.configurable as ToolRuntime | undefined;
  return {
    userToken: c?.userToken,
    userId: c?.userId,
  };
}

export { getRuntime };
