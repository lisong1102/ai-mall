import { createFileRoute, redirect } from "@tanstack/react-router";
import { Spin } from "antd";
import AdminLayout from "@/components/layout/admin-layout";
import { useAuth } from "@/lib/auth";
import { getToken } from "@/lib/auth-token";

/**
 * 管理后台布局路由（pathless layout route）。
 * beforeLoad 在 React 之外执行，只能同步检查 localStorage 里的 token；
 * token 是否真正有效由 Root 挂载时的 /auth/me 兜底（401 拦截器会踢回登录页）。
 */
export const Route = createFileRoute("/_admin")({
  beforeLoad: ({ location }) => {
    if (!getToken()) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AdminGuard,
});

/** 等待启动期 /auth/me 恢复登录态后再渲染后台，避免无效 token 下的页面闪烁 */
function AdminGuard() {
  const { initializing } = useAuth();
  if (initializing) {
    return (
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }
  return <AdminLayout />;
}
