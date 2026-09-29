import { createFileRoute } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import {
  Card,
  Input,
  Select,
  Button,
  Tag,
  Pagination,
  Table,
  Drawer,
  Descriptions,
  Spin,
} from "antd";
import type { TableProps } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { OrderVO, OrderItemVO, pageOrders, getOrder } from "@/api/mall";
import dayjs from "dayjs";

export const Route = createFileRoute("/_admin/orders")({
  component: Orders,
});

/** 订单状态：0待付款 1已付款 2已发货 3已完成 4已取消 */
const ORDER_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "待付款", color: "gold" },
  1: { label: "已付款", color: "blue" },
  2: { label: "已发货", color: "cyan" },
  3: { label: "已完成", color: "green" },
  4: { label: "已取消", color: "default" },
};

const actionLinkStyle: CSSProperties = {
  color: "var(--color-jade-deep)",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  marginRight: 8,
};

const itemColumns: TableProps<OrderItemVO>["columns"] = [
  { title: "商品", dataIndex: "productName", key: "productName" },
  {
    title: "单价",
    dataIndex: "price",
    key: "price",
    align: "right",
    className: "num",
    render: (price: number) => `¥${price.toFixed(2)}`,
  },
  {
    title: "数量",
    dataIndex: "quantity",
    key: "quantity",
    align: "right",
    className: "num",
  },
  {
    title: "小计",
    dataIndex: "subtotal",
    key: "subtotal",
    align: "right",
    className: "num",
    render: (subtotal: number) => `¥${subtotal.toFixed(2)}`,
  },
];

function Orders() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["orders", page, size],
    queryFn: () => pageOrders({ page, size }),
  });
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["order", detailId],
    queryFn: () => getOrder(detailId as string),
    enabled: !!detailId,
  });

  const columns: TableProps<OrderVO>["columns"] = [
    { title: "订单号", dataIndex: "orderNo", key: "orderNo", className: "num" },
    { title: "客户", dataIndex: "customerName", key: "customerName" },
    {
      title: "商品",
      dataIndex: "product",
      key: "product",
      render: (_, v: OrderVO) =>
        v?.items?.map((item) => (
          <div key={item.productId}>
            {item.productName + " x " + item.quantity + ""}
          </div>
        )),
    },
    {
      title: "金额",
      dataIndex: "totalAmount",
      key: "totalAmount",
      className: "num",
      render: (totalAmount: number) => `¥${totalAmount.toFixed(2)}`,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: number) => (
        <Tag
          color={ORDER_STATUS_MAP[status]?.color}
          style={{ borderRadius: 999 }}
        >
          {ORDER_STATUS_MAP[status]?.label ?? status}
        </Tag>
      ),
    },
    {
      title: "下单时间",
      dataIndex: "createdAt",
      key: "createdAt",
      className: "num",
      render: (createdAt: string) =>
        dayjs(createdAt).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "操作",
      key: "action",
      align: "right",
      render: (_, o) => (
        <>
          <a style={actionLinkStyle} onClick={() => setDetailId(o.id)}>
            详情
          </a>
          {o.status === 2 && <a style={actionLinkStyle}>物流</a>}
          {o.status === 0 && (
            <a
              style={{
                ...actionLinkStyle,
                color: "var(--color-rose)",
                marginRight: 0,
              }}
            >
              催付
            </a>
          )}
          {o.status === 3 && (
            <a style={{ ...actionLinkStyle, marginRight: 0 }}>售后单</a>
          )}
        </>
      ),
    },
  ];

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
          <h2 style={{ fontSize: 18, margin: 0 }}>订单管理</h2>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--color-ink-3)",
              marginTop: 3,
            }}
          >
            跟踪订单状态、发货与售后关联
          </p>
        </div>
        {/* <Button
          icon={<DownloadOutlined />}
          style={{ height: 37, borderRadius: 11 }}
        >
          导出报表
        </Button> */}
      </div>

      <Card
        styles={{ body: { padding: 20 } }}
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <Input placeholder="订单号 / 客户姓名" style={{ width: 200 }} />
          <Select
            defaultValue="all"
            style={{ width: 130 }}
            options={[
              { value: "all", label: "全部状态" },
              { value: "2", label: "已发货" },
              { value: "3", label: "已完成" },
              { value: "0", label: "待付款" },
            ]}
          />
          <Button type="primary" style={{ height: 37, borderRadius: 11 }}>
            查询
          </Button>
          <Button style={{ height: 37, borderRadius: 11 }}>重置</Button>
        </div>

        <Table<OrderVO>
          columns={columns}
          dataSource={data?.records || []}
          rowKey="orderNo"
          pagination={{
            total: data?.total || 0,
            current: page,
            pageSize: size,
            onChange(page, pageSize) {
              setPage(page);
              setSize(pageSize);
            },
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            justifyContent: "flex-end",
            marginTop: 16,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--color-ink-3)",
              marginRight: "auto",
            }}
            className="num"
          >
            共 86 条 · 第 1/9 页
          </span>
          <Pagination
            defaultCurrent={1}
            total={86}
            pageSize={10}
            showSizeChanger={false}
          />
        </div>
      </Card>

      <Drawer
        title="订单详情"
        width={560}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        destroyOnHidden
      >
        <Spin spinning={detailLoading}>
          {detail && (
            <>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="订单号" span={2}>
                  <span className="num">{detail.orderNo}</span>
                </Descriptions.Item>
                <Descriptions.Item label="客户">
                  {detail.customerName ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={ORDER_STATUS_MAP[detail.status]?.color}>
                    {ORDER_STATUS_MAP[detail.status]?.label ?? detail.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="订单金额" span={2}>
                  <span className="num" style={{ fontWeight: 600 }}>
                    ¥{detail.totalAmount.toFixed(2)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="下单时间" span={2}>
                  <span className="num">
                    {dayjs(detail.createdAt).format("YYYY-MM-DD HH:mm:ss")}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="备注" span={2}>
                  {detail.remark ?? "—"}
                </Descriptions.Item>
              </Descriptions>

              <h3 style={{ fontSize: 14, margin: "20px 0 12px" }}>商品明细</h3>
              <Table<OrderItemVO>
                columns={itemColumns}
                dataSource={detail.items ?? []}
                rowKey="id"
                size="small"
                pagination={false}
              />
            </>
          )}
        </Spin>
      </Drawer>
    </div>
  );
}
