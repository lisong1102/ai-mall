import { AgentKey, agents } from "./agents";
import {
  Annotation,
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";
import { route } from "./supervisor";
import { checkpointer } from "./checkpointer";
//单agent调用
function getAgent(key: AgentKey) {
  const a = agents[key];
  if (!a) throw new Error(`未知 agent: ${key}`);
  return a;
}

// 状态定义
const State = Annotation.Root({
  ...MessagesAnnotation.spec,
  customId: Annotation<string>({
    reducer: (_state, update) => update,
    default: () => "",
  }),
  category: Annotation<string>({
    reducer: (_state, update) => update,
    default: () => "",
  }),
});

async function supervisorNode(state: typeof State.State) {
  // 分诊只看对话内容：过滤掉 ToolMessage——
  // 1) 工具 JSON 结果对意图分类没有帮助；
  // 2) 映射成裸 {role:"tool"} 会丢 tool_call_id，模型消息强转会报 MESSAGE_COERCION_FAILURE
  const messages = state.messages
    .filter((m) => m.getType() !== "tool")
    .map((m) => ({
      role: m.getType() === "human" ? "user" : m.getType(),
      content:
        m.contentBlocks
          ?.filter((b) => b.type === "text")
          .map((b) => (b as { text: string }).text)
          .join("") ?? "",
    }));
  const { category } = await route(messages);
  return { category };
}

async function runAgent(
  agent: (typeof agents)[AgentKey],
  state: typeof State.State,
  config?: RunnableConfig,
) {
  // 透传 config：把 configurable（含 userToken）与 signal 一路带到专科 agent 的工具调用
  const result = await agent.invoke({ messages: state.messages }, config);
  // 把专科 Agent 的最终回复合并回主流
  return { messages: result.messages.slice(state.messages.length) };
}

const builder = new StateGraph(State)
  .addNode("supervisor", supervisorNode)
  .addNode("order", (s, config) => runAgent(getAgent("order"), s, config))
  .addNode("refund", (s, config) => runAgent(getAgent("refund"), s, config))
  .addNode("complaint", (s, config) =>
    runAgent(getAgent("complaint"), s, config),
  )
  .addNode("general", (s, config) => runAgent(getAgent("normal"), s, config))
  .addEdge(START, "supervisor")
  .addConditionalEdges("supervisor", (s) => s.category, {
    order: "order",
    refund: "refund",
    complaint: "complaint",
    general: "general",
  })
  .addEdge("order", END)
  .addEdge("refund", END)
  .addEdge("complaint", END)
  .addEdge("general", END);

const graph = builder.compile({
  checkpointer,
});

// 导出 graph 和 getAgent
export { graph, getAgent };
