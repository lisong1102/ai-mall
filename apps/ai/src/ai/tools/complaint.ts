// src/tools/orders.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const createTicket = tool(
  async ({ customerId, title, description, priority }) => {
    const ticketId = `T-${Date.now()}`;
    return JSON.stringify({
      ticketId,
      customerId,
      title,
      description,
      priority,
      assignedTo: priority === "high" ? "senior_agent_pool" : "general_pool",
    });
  },

  {
    name: "create_ticket",
    description: "为无法立即处理的复杂问题创建工单，会自动派单给人工客服。",
    schema: z.object({
      customerId: z.string(),
      title: z.string().describe("工单标题（一句话）"),
      description: z.string().describe("问题详细描述"),
      priority: z.enum(["low", "medium", "high"]),
    }),
  },
);
