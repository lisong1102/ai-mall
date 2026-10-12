import { RefundApprovalRequest } from "@/type/message-part";
import { CompiledStateGraph, Graph } from "@langchain/langgraph";

/** 查询会话是否有待恢复的 interrupt（发消息守卫 / resume 幂等 / 历史兜底共用） */
async function getPendingInterrupt(
  conversationId: string,
  graph: SafeAny,
): Promise<RefundApprovalRequest | null> {
  const state = await graph.getState({
    configurable: { thread_id: conversationId },
  });
  const task = state.tasks.find((t: SafeAny) => t.interrupts?.length);
  return (
    (task?.interrupts?.[0] as { value?: RefundApprovalRequest } | undefined)
      ?.value ?? null
  );
}

export { getPendingInterrupt };
