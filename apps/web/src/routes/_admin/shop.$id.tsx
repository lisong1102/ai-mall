import { useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Button,
  Tag,
  InputNumber,
  Spin,
  Empty,
  message,
  Breadcrumb,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { getProduct } from "@/api/mall";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/_admin/shop/$id")({
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = useParams({ from: "/_admin/shop/$id" });
  const navigate = useNavigate();
  const { addItem, setDrawerOpen } = useCart();
  const [qty, setQty] = useState(1);

  const { data: p, isFetching } = useQuery({
    queryKey: ["shop-product", id],
    queryFn: () => getProduct(id),
    enabled: !!id,
  });

  if (isFetching && !p) {
    return (
      <div style={{ display: "grid", placeItems: "center", padding: 80 }}>
        <Spin />
      </div>
    );
  }

  if (!p) {
    return <Empty description="商品不存在或已下架" style={{ padding: 60 }} />;
  }

  const out = p.stock === 0;
  const thumbText = p.name?.[0] ?? "?";
  const thumbBg =
    out
      ? "linear-gradient(140deg, #f0a5a5, #d96b6b)"
      : "linear-gradient(140deg, #6fc7a3, #2e9e72)";

  const handleAdd = (openDrawer: boolean) => {
    addItem(p, qty);
    message.success(`已加入购物车：${p.name} × ${qty}`);
    if (openDrawer) setDrawerOpen(true);
  };

  return (
    <div>
      {/* 面包屑 + 返回 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate({ to: "/shop" })}
          style={{ borderRadius: 11 }}
        >
          返回商城
        </Button>
        <Breadcrumb
          items={[
            { title: "交易中心" },
            { title: "商城", href: "/shop" },
            { title: p.name },
          ]}
        />
      </div>

      <Card
        styles={{ body: { padding: 24 } }}
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {/* 左：大图 */}
          <div
            style={{
              width: 340,
              height: 340,
              borderRadius: 16,
              background: p.coverImage
                ? `url(${p.coverImage}) center/cover`
                : thumbBg,
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontSize: 96,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {!p.coverImage && thumbText}
          </div>

          {/* 右：信息 */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <h2 style={{ fontSize: 22, margin: 0, fontWeight: 700 }}>
                {p.name}
              </h2>
              <Tag color="green" style={{ borderRadius: 999 }}>
                {p.categoryName ?? "未分类"}
              </Tag>
            </div>

            <div
              style={{
                fontSize: 12,
                color: "var(--color-ink-3)",
                marginBottom: 14,
              }}
              className="num"
            >
              ID：{p.id}
            </div>

            {/* 价格 */}
            <div
              style={{
                background: "rgba(62,184,142,0.08)",
                borderRadius: 12,
                padding: "14px 18px",
                marginBottom: 18,
                display: "flex",
                alignItems: "baseline",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: "var(--color-ink-3)",
                }}
              >
                售价
              </span>
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: "var(--color-jade-deep)",
                }}
                className="num"
              >
                ¥ {p.price.toFixed(2)}
              </span>
            </div>

            {/* 库存 */}
            <div
              style={{
                display: "flex",
                gap: 24,
                marginBottom: 18,
                fontSize: 13.5,
              }}
            >
              <div>
                <span style={{ color: "var(--color-ink-3)" }}>库存：</span>
                <b style={{ color: out ? "var(--color-rose)" : "inherit" }}>
                  {out ? "缺货" : `${p.stock} 件`}
                </b>
              </div>
              <div>
                <span style={{ color: "var(--color-ink-3)" }}>状态：</span>
                <Tag color={out ? "rose" : "green"} style={{ borderRadius: 999 }}>
                  {out ? "缺货" : "在售"}
                </Tag>
              </div>
            </div>

            {/* 描述 */}
            {p.description && (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--color-ink-3)",
                    marginBottom: 6,
                  }}
                >
                  商品描述
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    lineHeight: 1.7,
                    color: "var(--color-ink-2)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {p.description}
                </div>
              </div>
            )}

            {/* 数量 + 操作 */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <InputNumber
                min={1}
                max={p.stock}
                value={qty}
                onChange={(v) => setQty(v ?? 1)}
                style={{ width: 110, borderRadius: 11 }}
                disabled={out}
              />
              <Button
                type="primary"
                disabled={out}
                onClick={() => handleAdd(false)}
                style={{ height: 38, borderRadius: 11, fontWeight: 600 }}
              >
                加入购物车
              </Button>
              <Button
                type="primary"
                disabled={out}
                onClick={() => handleAdd(true)}
                style={{ height: 38, borderRadius: 11, fontWeight: 600 }}
              >
                立即购买
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
