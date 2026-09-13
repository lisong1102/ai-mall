import type { ThemeConfig } from "antd";

/**
 * 白茶清欢 · antd 主题配置
 * 所有色值溯源到 src/styles.css 的 CSS 变量，保持单一来源
 */
export const themeConfig: ThemeConfig = {
  token: {
    // 主色 — 茶青绿
    colorPrimary: "#2ea776",
    colorInfo: "#2ea776",
    colorSuccess: "#2ea776",
    colorWarning: "#e3b044",
    colorError: "#e0807b",

    // 文字 — 松墨色系
    colorText: "#1c3a31",
    colorTextSecondary: "#56706a",
    colorTextTertiary: "#93a79f",

    // 背景
    colorBgLayout: "#f3f7f4",
    colorBgContainer: "#ffffff",
    colorBgElevated: "#ffffff",

    // 边框
    colorBorder: "#e5efe9",
    colorBorderSecondary: "#eef4f0",

    // 圆角
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 10,

    // 字体
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif',
    fontSize: 14,

    // 阴影
    boxShadow: "0 1px 2px rgba(28,58,49,.04), 0 14px 34px -16px rgba(28,58,49,.16)",
    boxShadowSecondary: "0 1px 2px rgba(28,58,49,.05)",
  },
  components: {
    Layout: {
      bodyBg: "transparent",
      headerBg: "transparent",
      siderBg: "transparent",
      triggerBg: "#ffffff",
    },
    Menu: {
      itemBg: "transparent",
      itemSelectedBg: "#e2f5eb",
      itemSelectedColor: "#1e8a5e",
      itemHoverBg: "#eef4f0",
      itemHoverColor: "#1c3a31",
      itemColor: "#56706a",
      itemBorderRadius: 12,
      itemMarginInline: 0,
      subMenuItemBg: "transparent",
    },
    Card: {
      borderRadiusLG: 20,
      colorBorderSecondary: "#e5efe9",
    },
    Button: {
      borderRadius: 11,
      controlHeight: 37,
      primaryShadow: "0 8px 18px -8px rgba(46,167,118,.7)",
    },
    Input: {
      borderRadius: 11,
      controlHeight: 37,
      colorBgContainer: "#fbfdfc",
      activeBorderColor: "#9ed8bd",
      hoverBorderColor: "#9ed8bd",
    },
    Select: {
      borderRadius: 11,
      controlHeight: 37,
      colorBgContainer: "#fbfdfc",
    },
    Table: {
      headerColor: "#93a79f",
      headerBg: "transparent",
      borderColor: "#eef4f0",
      rowHoverBg: "#fafdfb",
    },
    Tag: {
      borderRadiusSM: 999,
    },
    Tabs: {
      itemColor: "#56706a",
      itemSelectedColor: "#1e8a5e",
      itemHoverColor: "#1c3a31",
      inkBarColor: "#2ea776",
    },
    Pagination: {
      itemSize: 32,
      borderRadius: 9,
    },
  },
};
