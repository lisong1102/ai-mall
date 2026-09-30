import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type CSSProperties } from "react";
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
  Modal,
  InputNumber,
  Radio,
  message,
  Popconfirm,
  Space,
} from "antd";
import type { TableProps } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OrderVO,
  OrderItemVO,
  pageOrders,
  getOrder,
  getEnums,
  OrderStatus,
  applyAfterSale,
  updateOrderStatus,
} from "@/api/mall";
import dayjs from "dayjs";

export const Route = createFileRoute("/_admin/orders")({
  component: Orders,
});

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
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [detailId, setDetailId] = useState<string | null>(null);
  // 申请售后：目标订单与表单状态
  const [asTarget, setAsTarget] = useState<OrderVO | null>(null);
  const [asType, setAsType] = useState<number>(1);
  const [asReason, setAsReason] = useState("");
  const [asAmount, setAsAmount] = useState<number | null>(null);

  const applyMutation = useMutation({
    mutationFn: (req: { orderId: string; customerId: string }) =>
      applyAfterSale({
        ...req,
        type: asType,
        reason: asReason || undefined,
        refundAmount: asAmount ?? undefined,
      }),
    onSuccess: () => {
      message.success("售后申请已提交，可在售后管理中审核");
      setAsTarget(null);
      queryClient.invalidateQueries({ queryKey: ["after-sales"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  // 订单状态流转：仅提供合法的下一步动作，Popconfirm 确认后切换
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: () => {
      message.success("订单状态已更新");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => message.error(e.message),
  });
  const { data } = useQuery({
    queryKey: ["orders", page, size, search, status],
    queryFn: () => pageOrders({ page, size, orderNo: search, status }),
  });
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["order", detailId],
    queryFn: () => getOrder(detailId as string),
    enabled: !!detailId,
  });
  // 订单状态字典由后端统一下发，枚举低频变更故整会话缓存
  const { data: enums } = useQuery({
    queryKey: ["enums", "order_status"],
    queryFn: () => getEnums(["order_status"]),
    staleTime: Infinity,
  });
  const statusOptions = useMemo(() => enums?.order_status ?? [], [enums]);
  const statusMap = useMemo(
    () =>
      Object.fromEntries(statusOptions.map((o) => [o.code, o])) as Record<
        number,
        { label: string; color: string | null }
      >,
    [statusOptions],
  );

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
          color={statusMap[status]?.color ?? undefined}
          style={{ borderRadius: 999 }}
        >
          {statusMap[status]?.label ?? status}
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
      render: (_, o) => {
        const link = { ...actionLinkStyle, marginRight: 0 };
        /** 取消订单（待付款/已付款 可取消） */
        const cancelAction = (
          <Popconfirm
            key="cancel"
            title="确认取消该订单？"
            onConfirm={() => statusMutation.mutate({ id: o.id, status: 4 })}
            okText="确认取消"
            okButtonProps={{ danger: true }}
            cancelText="返回"
          >
            <a style={{ ...link, color: "var(--color-rose)" }}>取消订单</a>
          </Popconfirm>
        );
        const actions: React.ReactNode[] = [
          <a key="detail" style={link} onClick={() => setDetailId(o.id)}>
            详情
          </a>,
        ];
        if (o.status === 0) {
          // 待付款 → 已付款 / 已取消
          actions.push(
            <Popconfirm
              key="pay"
              title="确认已收到货款？"
              onConfirm={() => statusMutation.mutate({ id: o.id, status: 1 })}
              okText="确认"
              cancelText="取消"
            >
              <a style={link}>标记付款</a>
            </Popconfirm>,
            cancelAction,
          );
        }
        if (o.status === 1) {
          // 已付款 → 已发货 / 已取消
          actions.push(
            <Popconfirm
              key="ship"
              title="确认订单已发货？"
              onConfirm={() => statusMutation.mutate({ id: o.id, status: 2 })}
              okText="确认"
              cancelText="取消"
            >
              <a style={link}>发货</a>
            </Popconfirm>,
            cancelAction,
          );
        }
        if (o.status === 2) {
          // 已发货 → 已完成
          actions.push(
            <Popconfirm
              key="complete"
              title="确认买家已收货，订单完成？"
              onConfirm={() => statusMutation.mutate({ id: o.id, status: 3 })}
              okText="确认"
              cancelText="取消"
            >
              <a style={link}>确认完成</a>
            </Popconfirm>,
          );
        }
        if (o.status === 3) {
          // 已完成 → 申请售后
          actions.push(
            <a
              key="after-sale"
              style={link}
              onClick={() => {
                setAsType(1);
                setAsReason("");
                setAsAmount(o.totalAmount);
                setAsTarget(o);
              }}
            >
              申请售后
            </a>,
          );
        }
        return <Space size={12}>{actions}</Space>;
      },
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
          <Input
            placeholder="订单号"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e)}
            style={{ width: 130 }}
            options={[
              { value: "", label: "全部状态" },
              ...statusOptions.map((o) => ({
                value: String(o.code),
                label: o.label,
              })),
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
                  <Tag color={statusMap[detail.status]?.color ?? undefined}>
                    {statusMap[detail.status]?.label ?? detail.status}
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

      {/* 申请售后弹窗 */}
      <Modal
        title="申请售后"
        open={!!asTarget}
        onCancel={() => setAsTarget(null)}
        onOk={() =>
          asTarget &&
          applyMutation.mutate({
            orderId: asTarget.id,
            customerId: asTarget.customerId,
          })
        }
        okText="提交申请"
        confirmLoading={applyMutation.isPending}
        destroyOnHidden
      >
        {asTarget && (
          <div style={{ display: "grid", gap: 14, paddingTop: 4 }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="订单号">
                <span className="num">{asTarget.orderNo}</span>
              </Descriptions.Item>
              <Descriptions.Item label="客户">
                {asTarget.customerName ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="订单金额">
                <span className="num">¥{asTarget.totalAmount.toFixed(2)}</span>
              </Descriptions.Item>
            </Descriptions>
            <div>
              <div style={{ marginBottom: 6, fontSize: 13 }}>售后类型</div>
              <Radio.Group
                value={asType}
                onChange={(e) => setAsType(e.target.value)}
              >
                <Radio value={1}>仅退款</Radio>
                <Radio value={2}>退货退款</Radio>
              </Radio.Group>
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 13 }}>申请原因</div>
              <Input.TextArea
                rows={2}
                maxLength={255}
                placeholder="如：商品破损 / 尺寸不合适"
                value={asReason}
                onChange={(e) => setAsReason(e.target.value)}
              />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontSize: 13 }}>退款金额</div>
              <InputNumber
                style={{ width: 200 }}
                min={0}
                precision={2}
                addonBefore="¥"
                value={asAmount}
                onChange={(v) => setAsAmount(v)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
