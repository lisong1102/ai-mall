/**
 * 全部死数据 — 纯 UI 阶段使用，后续替换为真实接口
 */

// ============ 仪表盘统计 ============
export interface StatItem {
  label: string;
  value: string;
  trend: string;
  trendType: "up" | "warm";
  icon: "money" | "order" | "user" | "clock";
  color: "jade" | "sky" | "apricot" | "gold";
}

export const stats: StatItem[] = [
  { label: "今日销售额", value: "¥ 12,846", trend: "+12.5%", trendType: "up", icon: "money", color: "jade" },
  { label: "今日订单", value: "86", trend: "+8.2%", trendType: "up", icon: "order", color: "sky" },
  { label: "新增客户", value: "14", trend: "+3", trendType: "up", icon: "user", color: "apricot" },
  { label: "待处理售后", value: "2", trend: "需尽快审核", trendType: "warm", icon: "clock", color: "gold" },
];

// ============ 销售趋势（近7日） ============
export interface SalesBar {
  label: string;
  value: number;
  hot?: boolean;
  amount?: string;
}

export const salesBars: SalesBar[] = [
  { label: "周一", value: 46 },
  { label: "周二", value: 58 },
  { label: "周三", value: 40 },
  { label: "周四", value: 66 },
  { label: "周五", value: 72 },
  { label: "周六", value: 92, hot: true, amount: "¥12.8k" },
  { label: "今日", value: 61 },
];

// ============ 类目销售占比 ============
export interface CategoryShare {
  name: string;
  percent: number;
  color: string;
}

export const categoryShares: CategoryShare[] = [
  { name: "手机数码", percent: 38, color: "#2ea776" },
  { name: "电脑办公", percent: 25, color: "#4d93a3" },
  { name: "家用电器", percent: 18, color: "#7cc99f" },
  { name: "运动户外", percent: 11, color: "#e3b044" },
  { name: "其他", percent: 8, color: "#d9e5df" },
];

// ============ 最新订单（仪表盘） ============
export interface OrderRow {
  orderNo: string;
  customer: string;
  amount: string;
  status: "已发货" | "已完成" | "待付款" | "售后中";
  time: string;
}

export const recentOrders: OrderRow[] = [
  { orderNo: "ORD202609120086", customer: "林清晏", amount: "¥ 2,399.00", status: "已发货", time: "09-12 10:24" },
  { orderNo: "ORD202609120085", customer: "苏婉", amount: "¥ 329.00", status: "已完成", time: "09-12 09:58" },
  { orderNo: "ORD202609120084", customer: "周屿", amount: "¥ 5,199.00", status: "待付款", time: "09-12 09:31" },
  { orderNo: "ORD202609120083", customer: "陈默", amount: "¥ 158.00", status: "售后中", time: "09-12 08:47" },
];

// ============ 商品管理 ============
export interface ProductRow {
  name: string;
  sku: string;
  category: string;
  price: string;
  stock: number;
  status: "在售" | "缺货" | "已下架";
  createdAt: string;
  thumbColor: string;
  thumbText: string;
}

export const products: ProductRow[] = [
  { name: "青风 Pro 智能手机 256G", sku: "QF-PRO-256", category: "手机数码", price: "¥ 3,999.00", stock: 128, status: "在售", createdAt: "09-01", thumbColor: "linear-gradient(140deg, #6fc7a3, #2e9e72)", thumbText: "机" },
  { name: "雾屿轻薄笔记本 14″", sku: "WY-BK-14", category: "电脑办公", price: "¥ 5,499.00", stock: 42, status: "在售", createdAt: "08-28", thumbColor: "linear-gradient(140deg, #8fc9d6, #4d93a3)", thumbText: "本" },
  { name: "山雾恒温电水壶 1.5L", sku: "SM-KT-15", category: "家用电器", price: "¥ 269.00", stock: 0, status: "缺货", createdAt: "08-20", thumbColor: "linear-gradient(140deg, #f4b98a, #e08449)", thumbText: "壶" },
  { name: "牧野轻户外双肩包 22L", sku: "MY-BG-22", category: "运动户外", price: "¥ 189.00", stock: 210, status: "已下架", createdAt: "08-12", thumbColor: "linear-gradient(140deg, #eccb7a, #d09e2e)", thumbText: "包" },
];

// ============ 订单管理 ============
export interface OrderFullRow {
  orderNo: string;
  customer: string;
  product: string;
  amount: string;
  status: "已发货" | "已完成" | "待付款" | "售后中" | "已取消";
  time: string;
}

export const orderList: OrderFullRow[] = [
  { orderNo: "ORD202609120086", customer: "林清晏", product: "青风 Pro 智能手机 等 2 件", amount: "¥ 2,399.00", status: "已发货", time: "09-12 10:24" },
  { orderNo: "ORD202609120085", customer: "苏婉", product: "山雾恒温电水壶", amount: "¥ 329.00", status: "已完成", time: "09-12 09:58" },
  { orderNo: "ORD202609120084", customer: "周屿", product: "雾屿轻薄笔记本 14″", amount: "¥ 5,199.00", status: "待付款", time: "09-12 09:31" },
  { orderNo: "ORD202609120083", customer: "陈默", product: "牧野轻户外双肩包 22L", amount: "¥ 158.00", status: "售后中", time: "09-12 08:47" },
  { orderNo: "ORD202609110079", customer: "何知夏", product: "青风蓝牙耳机", amount: "¥ 459.00", status: "已取消", time: "09-11 21:06" },
];

// ============ 状态 Pill 配色映射 ============
export const statusColorMap: Record<string, "green" | "sky" | "gold" | "rose" | "gray"> = {
  "在售": "green",
  "已完成": "green",
  "已发货": "sky",
  "待付款": "gold",
  "售后中": "rose",
  "缺货": "rose",
  "已下架": "gray",
  "已取消": "gray",
};

// ============ AI 工作台 — 会话列表 ============
export interface Conversation {
  id: string;
  title: string;
  preview: string;
  time: string;
  icon: "chat" | "chart" | "doc";
  group: "today" | "yesterday";
}

export const conversations: Conversation[] = [
  { id: "1", title: "青风 Pro 商品文案优化", preview: "已生成 3 版卖点描述…", time: "10:24", icon: "chat", group: "today" },
  { id: "2", title: "本周销售数据分析", preview: "已调用订单统计接口…", time: "09:12", icon: "chart", group: "today" },
  { id: "3", title: "批量订单状态跟进", preview: "已完成 12 笔订单的状态汇总…", time: "昨天", icon: "doc", group: "yesterday" },
  { id: "4", title: "客户画像分析建议", preview: "针对高价值客户的运营策略…", time: "昨天", icon: "chat", group: "yesterday" },
];

// ============ 智能工具卡片 ============
export interface AITool {
  title: string;
  desc: string;
  color: "apricot" | "jade" | "sky";
  icon: "pen" | "chart" | "user" | "msg" | "refresh" | "more";
}

export const aiTools: AITool[] = [
  { title: "商品文案生成", desc: "输入商品参数，一键生成标题、卖点、详情描述", color: "apricot", icon: "pen" },
  { title: "数据洞察报告", desc: "自动生成销售周报、类目分析、异常预警", color: "jade", icon: "chart" },
  { title: "客户分层分析", desc: "按消费行为分层，输出运营与复购策略", color: "sky", icon: "user" },
  { title: "智能客服话术", desc: "售后、催付、评价邀约等场景话术一键生成", color: "apricot", icon: "msg" },
  { title: "库存智能补货", desc: "基于销量预测，生成补货建议清单", color: "jade", icon: "refresh" },
  { title: "更多工具", desc: "持续扩展中，敬请期待", color: "sky", icon: "more" },
];
