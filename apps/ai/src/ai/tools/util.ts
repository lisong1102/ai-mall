import { OrderToolRuntime } from "@/type";
import { RunnableConfig } from "@langchain/core/runnables";

// 从 LangChain configurable 提取鉴权上下文
function getRuntime(config?: RunnableConfig): OrderToolRuntime {
  const c = config?.configurable as OrderToolRuntime | undefined;
  return { userToken: c?.userToken };
}

export { getRuntime };
