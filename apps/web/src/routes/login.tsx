import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { App, Button, Form, Input } from "antd";
import {
  LockOutlined,
  ShoppingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { getToken } from "@/lib/auth-token";
import type { LoginReq } from "@/api/mall/types";

/** 回跳地址只接受站内路径，禁止 // 协议相对 URL 与登录页自身（防开放重定向/死循环） */
function resolveRedirect(redirect?: string): string | null {
  if (
    redirect &&
    redirect.startsWith("/") &&
    !redirect.startsWith("//") &&
    redirect !== "/login"
  ) {
    return redirect;
  }
  return null;
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  beforeLoad: ({ search }) => {
    // 已登录再访问登录页：直接进后台（token 失效时 401 拦截器会清 token 再踢回来）
    if (getToken()) {
      throw redirect({ to: resolveRedirect(search.redirect) ?? "/dashboard" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const search = Route.useSearch();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginReq) => {
    setLoading(true);
    try {
      await login(values);
      message.success("登录成功，欢迎回来");
      // 动态站内地址，类型上收窄为已知路由字面量，运行时 TanStack 按真实 path 跳转
      const target = resolveRedirect(search.redirect) ?? "/dashboard";
      await navigate({
        to: target as "/dashboard",
        replace: true,
      });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        height: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: 400,
          maxWidth: "100%",
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(18px)",
          border: "1px solid var(--color-line)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-card)",
          padding: "34px 34px 28px",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 26 }}>
          <span
            style={{
              width: 54,
              height: 54,
              borderRadius: 17,
              background: "linear-gradient(140deg, #3bb984, #1e8a5e)",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              boxShadow: "var(--shadow-jade)",
              marginBottom: 14,
            }}
          >
            <ShoppingOutlined style={{ fontSize: 26 }} />
          </span>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: 0.5 }}>
            AI Mall 后台
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-ink-3)",
              marginTop: 5,
              letterSpacing: 1,
            }}
          >
            登录经营控制台，让茶茶帮你打理店铺
          </div>
        </div>

        <Form<LoginReq>
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
          initialValues={{ username: "admin", password: "admin123" }}
          requiredMark={false}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input
              size="large"
              prefix={<UserOutlined style={{ color: "var(--color-ink-3)" }} />}
              placeholder="请输入用户名"
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined style={{ color: "var(--color-ink-3)" }} />}
              placeholder="请输入密码"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 14, marginTop: 6 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{ height: 42, borderRadius: 12, fontWeight: 600 }}
            >
              登 录
            </Button>
          </Form.Item>
        </Form>

        <div
          style={{
            background: "var(--color-jade-soft)",
            border: "1px dashed #b7e3cb",
            borderRadius: "var(--radius-sm)",
            padding: "9px 13px",
            fontSize: 12,
            color: "var(--color-jade-deep)",
            textAlign: "center",
          }}
        >
          学习环境默认账号：<b>admin</b> / <b>admin123</b>，登录后请及时修改
        </div>
      </div>
    </div>
  );
}
