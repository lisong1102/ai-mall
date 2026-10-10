// 订单相关类型定义
// 订单商品项
interface OrderItemVO {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  price: string;
  quantity: number;
  subtotal: string;
}

// 订单
interface OrderVO {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string | null;
  totalAmount: string;
  status: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemVO[] | null;
}

// 订单分页结果
interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

// 订单工具运行时上下文
interface OrderToolRuntime {
  userToken?: string;
}

/** 订单状态码 → 中文文案，与 mall-api OrderStatusEnum 对齐 */
const ORDER_STATUS: Record<number, string> = {
  0: "待付款",
  1: "已付款",
  2: "已发货",
  3: "已完成",
  4: "已取消",
  5: "退款中",
  6: "已退款",
};

export type { OrderItemVO, OrderVO, PageResult, OrderToolRuntime };
export { ORDER_STATUS };
