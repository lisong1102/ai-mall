import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { App, Button, Form, Input } from "antd";
import {
  LockOutlined,
  ShoppingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import { register } from "@/api/mall/auth";
import { getToken } from "@/lib/auth-token";
import type { RegisterReq } from "@/api/mall/types";

export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    if (getToken()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: RegisterReq & { confirm: string }) => {
    setLoading(true);
    try {
      await register({ username: values.username, password: values.password });
      message.success("注册成功，请登录");
      await navigate({ to: "/login", replace: true });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "注册失败，请重试");
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
            注册管理员账号
          </div>
        </div>

        <Form<RegisterReq & { confirm: string }>
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: "请输入用户名" },
              { min: 4, max: 16, message: "用户名长度 4-16 位" },
            ]}
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
            rules={[
              { required: true, message: "请输入密码" },
              { min: 6, max: 20, message: "密码长度 6-20 位" },
            ]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined style={{ color: "var(--color-ink-3)" }} />}
              placeholder="请输入密码"
            />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="确认密码"
            dependencies={["password"]}
            rules={[
              { required: true, message: "请确认密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined style={{ color: "var(--color-ink-3)" }} />}
              placeholder="请再次输入密码"
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
              注 册
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", fontSize: 13 }}>
          已有账号？{" "}
          <a
            onClick={() => navigate({ to: "/login", replace: true })}
            style={{ cursor: "pointer" }}
          >
            去登录
          </a>
        </div>
      </div>
    </div>
  );
}
