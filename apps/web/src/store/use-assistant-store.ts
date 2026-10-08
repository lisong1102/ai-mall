import { create } from "zustand";

interface AssistantState {
  /** 右侧 AI 助手面板是否展开，默认关闭；仅由仪表盘「问问 AI 助手」打开 */
  open: boolean;
  /** 打开助手面板 */
  openAssistant: () => void;
  /** 关闭助手面板 */
  closeAssistant: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  open: false,
  openAssistant: () => set({ open: true }),
  closeAssistant: () => set({ open: false }),
}));
