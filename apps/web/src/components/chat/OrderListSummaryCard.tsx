import { Button, Tag } from "antd";
import { useNavigate } from "@tanstack/react-router";
import { OrderedListOutlined } from "@ant-design/icons";
import type { OrderStatus } from "@/api/mall";

/**
 * 订单列表跳转卡片（props 与后端 list_orders 工具 write 的 props 对齐）：
 * 展示匹配条数与筛选条件，点击跳转订单管理页（URL 参数由 /orders 路由 validateSearch 消费）
 */
export default function OrderListSummaryCard({
  total,
  filterDesc,
  customerId,
  status,
  orderNo,
}: {
  total: number;
  filterDesc: string;
  customerId?: string;
  status?: OrderStatus;
  orderNo?: string;
}) {
  const navigate = useNavigate();

  const goOrders = () =>
    navigate({
      to: "/orders",
      search: {
        ...(customerId ? { customerId } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(orderNo ? { orderNo } : {}),
      },
    });

  return (
    <div
      style={{
        border: "1px solid var(--color-line)",
        borderRadius: 12,
        padding: "14px 16px",
        marginTop: 8,
        maxWidth: 420,
        background: "#fcfdfb",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 13 }}>
          共 <span style={{ color: "var(--color-apricot-deep)" }}>{total}</span>{" "}
          条订单
        </b>
        <div
          style={{
            fontSize: 12,
            color: "var(--color-ink-3)",
            marginTop: 4,
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          {filterDesc ? <Tag>{filterDesc}</Tag> : <Tag>全部订单</Tag>}
        </div>
      </div>
      <Button
        type="primary"
        size="small"
        icon={<OrderedListOutlined />}
        style={{ borderRadius: 9 }}
        onClick={goOrders}
      >
        查看详情
      </Button>
    </div>
  );
}
