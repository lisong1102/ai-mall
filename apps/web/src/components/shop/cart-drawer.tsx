import { useState } from "react";
import { Drawer, Button, InputNumber, Empty, Popconfirm, message } from "antd";
import { DeleteOutlined, ClearOutlined } from "@ant-design/icons";
import { useCart } from "@/lib/cart";
import CheckoutModal from "./checkout-modal";

/**
 * 购物车抽屉：挂载在 admin-layout main 区末尾，开闭由 CartContext.drawerOpen 控制。
 * 结算弹窗的 open 状态在本组件内部维护，避免 checkout-modal 常驻。
 */
export default function CartDrawer() {
  const {
    items,
    updateQty,
    removeItem,
    clear,
    totalCount,
    totalAmount,
    drawerOpen,
    setDrawerOpen,
  } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const handleCheckout = () => {
    if (items.length === 0) {
      message.warning("购物车为空");
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <>
      <Drawer
        title={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>购物车（{totalCount} 件）</span>
            {items.length > 0 && (
              <Popconfirm
                title="确认清空购物车？"
                onConfirm={() => {
                  clear();
                  message.success("已清空购物车");
                }}
              >
                <Button
                  size="small"
                  type="text"
                  icon={<ClearOutlined />}
                  style={{ color: "var(--color-ink-3)" }}
                >
                  清空
                </Button>
              </Popconfirm>
            )}
          </div>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={420}
        styles={{ body: { padding: 16 } }}
        footer={
          items.length > 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "var(--color-ink-3)" }}>
                  共 {totalCount} 件
                </div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  合计：
                  <span
                    style={{ color: "var(--color-jade-deep)" }}
                    className="num"
                  >
                    ¥ {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
              <Button
                type="primary"
                size="large"
                onClick={handleCheckout}
                style={{ borderRadius: 11, fontWeight: 600, minWidth: 120 }}
              >
                去结算
              </Button>
            </div>
          ) : null
        }
      >
        {items.length === 0 ? (
          <Empty description="购物车空空如也" style={{ padding: "60px 0" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((c) => (
              <div
                key={c.productId}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--color-line-soft)",
                  background: "rgba(255,255,255,0.6)",
                }}
              >
                {/* 缩略图 */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: c.coverImage
                      ? `url(${c.coverImage}) center/cover`
                      : "linear-gradient(140deg, #6fc7a3, #2e9e72)",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  {!c.coverImage && (c.name?.[0] ?? "?")}
                </div>

                {/* 信息 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-ink-3)",
                      marginTop: 2,
                    }}
                    className="num"
                  >
                    ¥ {c.price.toFixed(2)} · 库存 {c.stock}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 8,
                    }}
                  >
                    <InputNumber
                      min={1}
                      max={c.stock}
                      value={c.quantity}
                      onChange={(v) => updateQty(c.productId, v ?? 1)}
                      size="small"
                      style={{ width: 96, borderRadius: 8 }}
                    />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--color-jade-deep)",
                        }}
                        className="num"
                      >
                        ¥ {(c.price * c.quantity).toFixed(2)}
                      </span>
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeItem(c.productId)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />
    </>
  );
}
