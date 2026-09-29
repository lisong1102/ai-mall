import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Card,
  Input,
  Button,
  Tag,
  InputNumber,
  Pagination,
  Spin,
  Empty,
  message,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { pageProducts } from "@/api/mall";
import type { ProductVO } from "@/api/mall";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/_admin/shop")({
  component: Shop,
});

/** 取商品名首字 + 根据库存派生缩略图渐变色 */
function getThumb(p: ProductVO): { text: string; bg: string } {
  const text = p.name?.[0] ?? "?";
  const bg =
    p.stock === 0
      ? "linear-gradient(140deg, #f0a5a5, #d96b6b)"
      : "linear-gradient(140deg, #6fc7a3, #2e9e72)";
  return { text, bg };
}

function Shop() {
  const navigate = useNavigate();
  const { addItem, setDrawerOpen } = useCart();
  const [page, setPage] = useState(1);
  const [size] = useState(12);
  const [searchName, setSearchName] = useState("");
  // 每张卡片独立的加购数量（productId -> qty）
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  const { data, isFetching } = useQuery({
    queryKey: ["shop-products", page, size, searchName],
    queryFn: () =>
      pageProducts({
        page,
        size,
        name: searchName || undefined,
        status: 1, // 只查在售
      }),
    placeholderData: keepPreviousData,
  });

  const products = data?.records ?? [];

  const handleAdd = (p: ProductVO) => {
    const qty = qtyMap[p.id] ?? 1;
    addItem(p, qty);
    message.success(`已加入购物车：${p.name} × ${qty}`);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, margin: 0 }}>商城 · 代客下单</h2>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--color-ink-3)",
              marginTop: 3,
            }}
          >
            浏览在售商品，加入购物车后选择客户一键生成订单
          </p>
        </div>
      </div>

      <Card
        styles={{ body: { padding: 18 } }}
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        {/* 搜索栏 */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <Input
            placeholder="商品名称关键词"
            prefix={<SearchOutlined style={{ color: "var(--color-ink-3)" }} />}
            style={{ width: 220, borderRadius: 11 }}
            value={searchName}
            onChange={(e) => {
              setSearchName(e.target.value);
              setPage(1);
            }}
            allowClear
            onPressEnter={() => setPage(1)}
          />
          <Button
            type="primary"
            style={{ height: 37, borderRadius: 11 }}
            onClick={() => setPage(1)}
          >
            查询
          </Button>
          <Button
            style={{ height: 37, borderRadius: 11 }}
            onClick={() => {
              setSearchName("");
              setPage(1);
            }}
          >
            重置
          </Button>
        </div>

        {/* 卡片网格 */}
        {isFetching && products.length === 0 ? (
          <div style={{ display: "grid", placeItems: "center", padding: 60 }}>
            <Spin />
          </div>
        ) : products.length === 0 ? (
          <Empty description="暂无在售商品" style={{ padding: "40px 0" }} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {products.map((p) => {
              const thumb = getThumb(p);
              const qty = qtyMap[p.id] ?? 1;
              const out = p.stock === 0;
              return (
                <Card
                  key={p.id}
                  hoverable
                  styles={{ body: { padding: 12 } }}
                  style={{
                    borderRadius: 14,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* 封面 */}
                  <div
                    onClick={() =>
                      navigate({ to: "/shop/$id", params: { id: p.id } })
                    }
                    style={{
                      height: 150,
                      borderRadius: 10,
                      background: p.coverImage
                        ? `url(${p.coverImage}) center/cover`
                        : thumb.bg,
                      display: "grid",
                      placeItems: "center",
                      color: "#fff",
                      fontSize: 44,
                      fontWeight: 700,
                      cursor: "pointer",
                      marginBottom: 10,
                    }}
                  >
                    {!p.coverImage && thumb.text}
                  </div>

                  {/* 信息 */}
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13.5,
                      marginBottom: 6,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      navigate({ to: "/shop/$id", params: { id: p.id } })
                    }
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <Tag color="green" style={{ borderRadius: 999, margin: 0 }}>
                      {p.categoryName ?? "未分类"}
                    </Tag>
                    <span
                      style={{ fontSize: 11.5, color: "var(--color-ink-3)" }}
                    >
                      库存 {p.stock}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "var(--color-jade-deep)",
                      marginBottom: 8,
                    }}
                    className="num"
                  >
                    ¥ {p.price.toFixed(2)}
                  </div>

                  {/* 数量 + 加购 */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <InputNumber
                      min={1}
                      max={p.stock}
                      value={qty}
                      onChange={(v) =>
                        setQtyMap((m) => ({ ...m, [p.id]: v ?? 1 }))
                      }
                      style={{ flex: 1, borderRadius: 10 }}
                      disabled={out}
                    />
                    <Button
                      type="primary"
                      disabled={out}
                      onClick={() => handleAdd(p)}
                      style={{ borderRadius: 10, fontWeight: 600 }}
                    >
                      {out ? "缺货" : "加购"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* 分页 */}
        {products.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 18,
            }}
          >
            <Pagination
              current={page}
              pageSize={size}
              total={data?.total ?? 0}
              showSizeChanger={false}
              onChange={(p) => setPage(p)}
              showTotal={(t) =>
                `共 ${t} 条 · 第 ${page}/${Math.ceil((data?.total ?? 0) / size)} 页`
              }
            />
          </div>
        )}
      </Card>
    </div>
  );
}
