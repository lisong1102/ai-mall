import { AgentKey, agents } from "./agents";
import {
  Annotation,
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
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
  const messages = state.messages.map((m) => ({
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
) {
  const result = await agent.invoke({ messages: state.messages });
  // 把专科 Agent 的最终回复合并回主流
  return { messages: result.messages.slice(state.messages.length) };
}

const builder = new StateGraph(State)
  .addNode("supervisor", supervisorNode)
  .addNode("order", (s) => runAgent(getAgent("order"), s))
  .addNode("refund", (s) => runAgent(getAgent("refund"), s))
  .addNode("complaint", (s) => runAgent(getAgent("complaint"), s))
  .addNode("general", (s) => runAgent(getAgent("normal"), s))
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
