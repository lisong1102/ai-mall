/**
 * mall-api 领域类型：与 Java entity / VO / SaveReq 一一对应。
 * 注意：Java 雪花 ID（Long）已全局序列化为字符串，前端 id 一律 string；
 * 分页字段（total/current/size）为基本类型 long，输出为数字。
 */

/** 统一分页入参 */
export interface PageParams {
  page?: number;
  size?: number;
}

/** 统一分页出参 */
export interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

// ---------- 类目 ----------
export interface Category {
  id: string;
  name: string;
  parentId: string;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySaveReq {
  name: string;
  parentId?: string;
  sort?: number;
}

// ---------- 商品 ----------
export interface Product {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  stock: number;
  /** 1 上架 / 0 下架 */
  status: number;
  description: string | null;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 列表/详情联表返回类目名 */
export interface ProductVO extends Product {
  categoryName: string | null;
}

export interface ProductSaveReq {
  name: string;
  categoryId: string;
  price: number;
  stock?: number;
  status?: number;
  description?: string;
  coverImage?: string;
}

// ---------- 客户 ----------
export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSaveReq {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

// ---------- 订单 ----------
export interface OrderItemVO {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderVO {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string | null;
  totalAmount: number;
  /** 0待付款 1已付款 2已发货 3已完成 4已取消 */
  status: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  /** 仅详情接口返回 */
  items?: OrderItemVO[];
}

export interface OrderItemReq {
  productId: string;
  /** 商品名快照 */
  productName: string;
  /** 单价快照 */
  price: number;
  quantity: number;
}

export interface OrderSaveReq {
  customerId: string;
  remark?: string;
  items: OrderItemReq[];
}

// ---------- 售后 ----------
export interface AfterSaleVO {
  id: string;
  orderId: string;
  orderNo: string;
  customerId: string;
  customerName: string | null;
  /** 1仅退款 2退货退款 */
  type: number;
  reason: string | null;
  /** 0申请中 1审核通过 2已完成 3已拒绝 */
  status: number;
  refundAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AfterSaleSaveReq {
  orderId: string;
  customerId: string;
  type: number;
  reason?: string;
  refundAmount?: number;
}

// ---------- 认证 ----------
export interface AdminUser {
  /** 雪花 ID，字符串传输 */
  id: string;
  username: string;
  nickname: string;
}

export interface LoginReq {
  username: string;
  password: string;
}

export interface LoginResp {
  token: string;
  tokenType: string;
  /** 有效期（秒） */
  expiresIn: number;
  user: AdminUser;
}
