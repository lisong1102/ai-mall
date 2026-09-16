import { Outlet, useLocation } from "@tanstack/react-router";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import AIAssistant from "./ai-assistant/index";

const titleMap: Record<string, string> = {
  "/dashboard": "经营概况",
  "/products": "商品管理",
  "/categories": "类目管理",
  "/orders": "订单管理",
  "/after-sale": "售后管理",
  "/customers": "客户管理",
  "/ai/chat": "AI 工作台 · 对话",
  "/ai/knowledge": "AI 工作台 · 知识库",
  "/ai/tools": "AI 工作台 · 智能工具",
};

export default function AdminLayout() {
  const location = useLocation();
  const path = location.pathname === "/" ? "/dashboard" : location.pathname;
  const title = titleMap[path] ?? "经营概况";

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        display: "grid",
        gridTemplateColumns: "236px 1fr 392px",
        height: "100vh",
        gap: 18,
        padding: 18,
      }}
    >
      <Sidebar />

      <main
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <Topbar title={title} />
        <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 8px 2px" }}>
          <Outlet />
        </div>
      </main>

      <AIAssistant />
    </div>
  );
}
