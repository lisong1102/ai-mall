import { createFileRoute } from "@tanstack/react-router";
import { Card, Input, Select, Button, Tag, Pagination } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { orderList, statusColorMap } from "@/data/mock";

export const Route = createFileRoute("/_admin/orders")({
  component: Orders,
});

function Orders() {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, margin: 0 }}>订单管理</h2>
          <p style={{ fontSize: 12.5, color: "var(--color-ink-3)", marginTop: 3 }}>跟踪订单状态、发货与售后关联</p>
        </div>
        <Button icon={<DownloadOutlined />} style={{ height: 37, borderRadius: 11 }}>
          导出报表
        </Button>
      </div>

      <Card styles={{ body: { padding: 20 } }} style={{ borderRadius: "var(--radius-lg)" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <Input placeholder="订单号 / 客户姓名" style={{ width: 200 }} />
          <Select defaultValue="all" style={{ width: 130 }} options={[{ value: "all", label: "全部状态" }, { value: "2", label: "已发货" }, { value: "3", label: "已完成" }, { value: "0", label: "待付款" }]} />
          <Button type="primary" style={{ height: 37, borderRadius: 11 }}>查询</Button>
          <Button style={{ height: 37, borderRadius: 11 }}>重置</Button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["订单号", "客户", "商品", "金额", "状态", "下单时间", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 11.5, fontWeight: 600, color: "var(--color-ink-3)", letterSpacing: 1, padding: "0 12px 10px", borderBottom: "1px solid var(--color-line-soft)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orderList.map((o) => (
              <tr key={o.orderNo} style={{ transition: "background .15s" }}>
                <td style={{ padding: "13px 12px", fontSize: 13, borderBottom: "1px solid var(--color-line-soft)" }} className="num">{o.orderNo}</td>
                <td style={{ padding: "13px 12px", fontSize: 13, borderBottom: "1px solid var(--color-line-soft)" }}>{o.customer}</td>
                <td style={{ padding: "13px 12px", fontSize: 13, borderBottom: "1px solid var(--color-line-soft)" }}>{o.product}</td>
                <td style={{ padding: "13px 12px", fontSize: 13, borderBottom: "1px solid var(--color-line-soft)" }} className="num">{o.amount}</td>
                <td style={{ padding: "13px 12px", fontSize: 13, borderBottom: "1px solid var(--color-line-soft)" }}>
                  <Tag color={statusColorMap[o.status]} style={{ borderRadius: 999 }}>{o.status}</Tag>
                </td>
                <td style={{ padding: "13px 12px", fontSize: 13, borderBottom: "1px solid var(--color-line-soft)", color: "var(--color-ink-3)" }} className="num">{o.time}</td>
                <td style={{ padding: "13px 12px", fontSize: 13, borderBottom: "1px solid var(--color-line-soft)", textAlign: "right" }}>
                  <a style={{ color: "var(--color-jade-deep)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", marginRight: 8 }}>详情</a>
                  {o.status === "已发货" && <a style={{ color: "var(--color-jade-deep)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", marginRight: 8 }}>物流</a>}
                  {o.status === "待付款" && <a style={{ color: "var(--color-rose)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>催付</a>}
                  {o.status === "售后中" && <a style={{ color: "var(--color-jade-deep)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>售后单</a>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", marginTop: 16 }}>
          <span style={{ fontSize: 12, color: "var(--color-ink-3)", marginRight: "auto" }} className="num">共 86 条 · 第 1/9 页</span>
          <Pagination defaultCurrent={1} total={86} pageSize={10} showSizeChanger={false} />
        </div>
      </Card>
    </div>
  );
}
