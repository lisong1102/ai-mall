import { Layout, Menu, Avatar } from "antd";
import {
  DashboardOutlined,
  ShoppingOutlined,
  ShopOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  RetweetOutlined,
  UserOutlined,
  RobotOutlined,
  BookOutlined,
  ToolOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "@tanstack/react-router";
import type { MenuProps } from "antd";
import { useAuth } from "@/lib/auth";

const { Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

const menuItems: MenuItem[] = [
  {
    type: "group",
    label: "经营概况",
    key: "g1",
    children: [
      { key: "/dashboard", icon: <DashboardOutlined />, label: "仪表盘" },
    ],
  },
  {
    type: "group",
    label: "商品中心",
    key: "g2",
    children: [
      { key: "/products", icon: <ShoppingOutlined />, label: "商品管理" },
      { key: "/categories", icon: <AppstoreOutlined />, label: "类目管理" },
    ],
  },
  {
    type: "group",
    label: "交易中心",
    key: "g3",
    children: [
      { key: "/shop", icon: <ShopOutlined />, label: "商城" },
      { key: "/orders", icon: <FileTextOutlined />, label: "订单管理" },
      { key: "/after-sale", icon: <RetweetOutlined />, label: "售后管理" },
    ],
  },
  {
    type: "group",
    label: "客户中心",
    key: "g4",
    children: [
      { key: "/customers", icon: <UserOutlined />, label: "客户管理" },
    ],
  },
  {
    type: "group",
    label: "AI 工作台",
    key: "g5",
    children: [
      { key: "/ai/chat", icon: <RobotOutlined />, label: "AI 对话" },
      { key: "/ai/knowledge", icon: <BookOutlined />, label: "知识库" },
      { key: "/ai/tools", icon: <ToolOutlined />, label: "智能工具" },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const selectedKey =
    location.pathname === "/" ? "/dashboard" : location.pathname;

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  return (
    <Sider
      width={236}
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(14px)",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: "18px 14px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "6px 8px 18px",
        }}
      >
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: "linear-gradient(140deg, #3bb984, #1e8a5e)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            boxShadow: "var(--shadow-jade)",
            flexShrink: 0,
          }}
        >
          <ShoppingOutlined style={{ fontSize: 20 }} />
        </span>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: 0.5 }}>
            AI Mall 后台
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--color-ink-3)",
              letterSpacing: 2,
            }}
          >
            FRESH CONSOLE
          </div>
        </div>
      </div>

      {/* Menu */}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => navigate({ to: key as any })}
        style={{
          background: "transparent",
          borderInlineEnd: "none",
          flex: 1,
          overflowY: "auto",
        }}
      />

      {/* User */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderTop: "1px solid var(--color-line-soft)",
          paddingTop: 14,
          marginTop: 6,
        }}
      >
        <Avatar
          size={36}
          style={{
            background: "linear-gradient(140deg, #8fd8b6, #3a9f73)",
            fontWeight: 600,
          }}
        >
          {(user?.nickname ?? "管").charAt(0)}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {user?.nickname ?? "管理员"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--color-ink-3)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user?.username ?? "admin"}
          </div>
        </div>
        <button
          title="退出登录"
          onClick={handleLogout}
          style={{
            marginLeft: "auto",
            color: "var(--color-ink-3)",
            padding: 6,
            borderRadius: 9,
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <LogoutOutlined style={{ fontSize: 16 }} />
        </button>
      </div>
    </Sider>
  );
}
