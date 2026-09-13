import { createFileRoute } from "@tanstack/react-router";
import { Card, Input, Select, Button, Tag, Pagination } from "antd";
import { PlusOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { products, statusColorMap } from "@/data/mock";

export const Route = createFileRoute("/_admin/products")({
  component: Products,
});

function Products() {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, margin: 0 }}>商品管理</h2>
          <p style={{ fontSize: 12.5, color: "var(--color-ink-3)", marginTop: 3 }}>共 24 件商品，维护商品信息、库存与上下架</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} style={{ height: 37, borderRadius: 11, fontWeight: 600 }}>
          新增商品
        </Button>
      </div>

      <Card styles={{ body: { padding: 20 } }} style={{ borderRadius: "var(--radius-lg)" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <Input placeholder="商品名称关键词" style={{ width: 190 }} />
          <Select defaultValue="all" style={{ width: 140 }} options={[{ value: "all", label: "全部类目" }, { value: "1", label: "手机数码" }, { value: "2", label: "电脑办公" }]} />
          <Select defaultValue="all" style={{ width: 120 }} options={[{ value: "all", label: "全部状态" }, { value: "1", label: "在售" }, { value: "0", label: "已下架" }]} />
          <Button type="primary" style={{ height: 37, borderRadius: 11 }}>查询</Button>
          <Button style={{ height: 37, borderRadius: 11 }}>重置</Button>
          <Button icon={<ThunderboltOutlined />} style={{ height: 37, borderRadius: 11, marginLeft: "auto" }}>
            AI 生成文案
          </Button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["商品", "类目", "价格", "库存", "状态", "创建时间", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 11.5, fontWeight: 600, color: "var(--color-ink-3)", letterSpacing: 1, padding: "0 12px 10px", borderBottom: "1px solid var(--color-line-soft)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.sku} style={{ transition: "background .15s" }}>
                <td style={{ padding: "13px 12px", fontSize: 13, borderBottom: "1px solid var(--color-line-soft)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: p.thumbColor }}>{p.thumbText}</span>
                    <div>
                      <b style={{ fontWeight: 600, display: "block" }}>{p.name}</b>
                      <span style={{ fontSize: 11.5, color: "var(--color-ink-3)" }}>SKU: {p.sku}</span>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "13px 12px", fontSize: 13, borderBottom: "1px solid var(--color-line-soft)" }}>{p.category}</td>
                <td style={{ padding: "13px 12px", fontSize: 13, borderBottom: "1px solid var(--color-line-soft)" }} className="num">{p.price}</td>
                <td style={{ padding: "13px 12px", fontSize: 13, borderBottom: "1px solid var(--color-line-soft)" }} className="num">{p.stock}</td>
                <td style={{ padding: "13px 12px", fontSize: 13, borderBottom: "1px solid var(--color-line-soft)" }}>
                  <Tag color={statusColorMap[p.status]} style={{ borderRadius: 999 }}>{p.status}</Tag>
                </td>
                <td style={{ padding: "13px 12px", fontSize: 13, borderBottom: "1px solid var(--color-line-soft)", color: "var(--color-ink-3)" }} className="num">{p.createdAt}</td>
                <td style={{ padding: "13px 12px", fontSize: 13, borderBottom: "1px solid var(--color-line-soft)", textAlign: "right" }}>
                  <a style={{ color: "var(--color-jade-deep)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", marginRight: 8 }}>编辑</a>
                  <a style={{ color: p.status === "缺货" ? "var(--color-jade-deep)" : "var(--color-rose)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    {p.status === "缺货" ? "补货" : p.status === "已下架" ? "上架" : "下架"}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", marginTop: 16 }}>
          <span style={{ fontSize: 12, color: "var(--color-ink-3)", marginRight: "auto" }} className="num">共 24 条 · 第 1/3 页</span>
          <Pagination defaultCurrent={1} total={24} pageSize={8} showSizeChanger={false} />
        </div>
      </Card>
    </div>
  );
}
