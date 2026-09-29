import { useDeferredValue, useState } from "react";
import { Modal, Select, Input, message } from "antd";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { createOrder, pageCustomers } from "@/api/mall";
import type { OrderItemReq } from "@/api/mall";
import { useCart } from "@/lib/cart";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 结算弹窗：选客户 + 备注 + 提交创建订单。
 * 客户选择走远程搜索（useDeferredValue 做轻量防抖），提交调 createOrder。
 */
export default function CheckoutModal({ open, onClose }: CheckoutModalProps) {
  const navigate = useNavigate();
  const { items, totalAmount, clear, setDrawerOpen } = useCart();
  const [customerId, setCustomerId] = useState<string>();
  const [remark, setRemark] = useState("");
  const [keyword, setKeyword] = useState("");
  const deferredKeyword = useDeferredValue(keyword);

  // 远程搜索客户（防抖：依赖 deferredKeyword 变化触发）
  const { data: customerPage, isFetching } = useQuery({
    queryKey: ["customers", deferredKeyword],
    queryFn: () =>
      pageCustomers({ name: deferredKeyword || undefined, size: 20 }),
    enabled: open,
  });
  const customerOptions = (customerPage?.records ?? []).map((c) => ({
    value: c.id,
    label: c.phone ? `${c.name}（${c.phone}）` : c.name,
  }));

  const mutation = useMutation({
    mutationFn: () => {
      const orderItems: OrderItemReq[] = items.map((c) => ({
        productId: c.productId,
        productName: c.name,
        price: c.price,
        quantity: c.quantity,
      }));
      return createOrder({ customerId: customerId!, remark, items: orderItems });
    },
    onSuccess: (id) => {
      message.success(`下单成功，订单 ID：${id}`);
      clear();
      setDrawerOpen(false);
      setCustomerId(undefined);
      setRemark("");
      setKeyword("");
      onClose();
      navigate({ to: "/orders" });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const handleSubmit = () => {
    if (!customerId) {
      message.warning("请选择客户");
      return;
    }
    if (items.length === 0) {
      message.warning("购物车为空");
      return;
    }
    // 库存兜底校验
    const over = items.find((c) => c.quantity > c.stock);
    if (over) {
      message.warning(`“${over.name}”数量超出库存`);
      return;
    }
    mutation.mutate();
  };

  const handleClose = () => {
    if (mutation.isPending) return;
    onClose();
  };

  return (
    <Modal
      title="确认订单"
      open={open}
      onOk={handleSubmit}
      onCancel={handleClose}
      okText="提交订单"
      cancelText="取消"
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: items.length === 0 }}
      destroyOnHidden
    >
      {/* 订单概要 */}
      <div
        style={{
          background: "rgba(62,184,142,0.06)",
          borderRadius: 12,
          padding: "12px 14px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
            fontSize: 12.5,
            color: "var(--color-ink-3)",
          }}
        >
          <span>商品种类</span>
          <b style={{ color: "var(--color-ink-2)" }}>{items.length} 种</b>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
          }}
        >
          <span style={{ color: "var(--color-ink-3)" }}>订单总额</span>
          <b
            style={{
              fontSize: 18,
              color: "var(--color-jade-deep)",
            }}
            className="num"
          >
            ¥ {totalAmount.toFixed(2)}
          </b>
        </div>
      </div>

      {/* 客户选择 */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--color-ink-3)",
            marginBottom: 6,
          }}
        >
          选择客户 <span style={{ color: "var(--color-rose)" }}>*</span>
        </div>
        <Select
          showSearch
          value={customerId}
          placeholder="输入姓名/手机号搜索客户"
          filterOption={false}
          onSearch={setKeyword}
          onChange={setCustomerId}
          loading={isFetching}
          options={customerOptions}
          style={{ width: "100%" }}
          notFoundContent={isFetching ? "搜索中…" : "无匹配客户"}
        />
      </div>

      {/* 备注 */}
      <div>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--color-ink-3)",
            marginBottom: 6,
          }}
        >
          订单备注
        </div>
        <Input.TextArea
          rows={2}
          maxLength={255}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="如：尽快发货"
        />
      </div>
    </Modal>
  );
}
