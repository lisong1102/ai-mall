import { deepseekModel } from "@/model";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import z from "zod";

const ConversationSchema = z.object({
  reply: z.string().max(100).describe("总结的会话内容"),
});

const analysisChain = ChatPromptTemplate.fromMessages([
  [
    "system",
    "你是一个专业的助手，能够根据用户的问题，以简短的语言总结用户的问题内容。",
  ],
  ["human", "{input}"],
]).pipe(
  deepseekModel.withStructuredOutput(ConversationSchema, {
    method: "functionCalling",
  }),
);

export default analysisChain;
