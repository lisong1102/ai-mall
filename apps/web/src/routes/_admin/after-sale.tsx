import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Input,
  Button,
  Table,
  Tag,
  Select,
  message,
  Popconfirm,
  Space,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import type { TableProps } from "antd";
import {
  pageAfterSales,
  reviewAfterSale,
  completeAfterSale,
  deleteAfterSale,
} from "@/api/mall";
import type { AfterSaleVO } from "@/api/mall";

export const Route = createFileRoute("/_admin/after-sale")({
  component: AfterSale,
});

/** 售后状态：0申请中 1审核通过 2已完成 3已拒绝 */
const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "申请中", color: "gold" },
  1: { label: "审核通过", color: "blue" },
  2: { label: "已完成", color: "green" },
  3: { label: "已拒绝", color: "red" },
};

/** 售后类型：1仅退款 2退货退款 */
const TYPE_MAP: Record<number, string> = {
  1: "仅退款",
  2: "退货退款",
};

function AfterSale() {
  const queryClient = useQueryClient();
  const [orderId, setOrderId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ["after-sales", page, pageSize, orderId, customerId, status],
    queryFn: () =>
      pageAfterSales({
        page,
        size: pageSize,
        orderId: orderId || undefined,
        customerId: customerId || undefined,
        status,
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, pass }: { id: string; pass: boolean }) =>
      reviewAfterSale(id, pass),
    onSuccess: (_, { pass }) => {
      message.success(pass ? "已通过" : "已拒绝");
      queryClient.invalidateQueries({ queryKey: ["after-sales"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeAfterSale(id),
    onSuccess: () => {
      message.success("已完成");
      queryClient.invalidateQueries({ queryKey: ["after-sales"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAfterSale(id),
    onSuccess: () => {
      message.success("删除成功");
      queryClient.invalidateQueries({ queryKey: ["after-sales"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const handleSearch = () => setPage(1);

  const handleReset = () => {
    setOrderId("");
    setCustomerId("");
    setStatus(undefined);
    setPage(1);
  };

  const columns: TableProps<AfterSaleVO>["columns"] = [
    {
      title: "售后单号",
      dataIndex: "id",
      key: "id",
      width: 180,
      ellipsis: true,
    },
    {
      title: "订单号",
      dataIndex: "orderNo",
      key: "orderNo",
      width: 160,
    },
    {
      title: "客户",
      dataIndex: "customerName",
      key: "customerName",
      width: 120,
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (v: number) => TYPE_MAP[v] ?? v,
    },
    {
      title: "原因",
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "退款金额",
      dataIndex: "refundAmount",
      key: "refundAmount",
      width: 110,
      render: (v: number | null) =>
        v != null ? `¥${v.toFixed(2)}` : "—",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (v: number) => {
        const s = STATUS_MAP[v];
        return <Tag color={s?.color}>{s?.label ?? v}</Tag>;
      },
    },
    {
      title: "申请时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_, record) => {
        const actions: React.ReactNode[] = [];
        // 申请中：审核通过 / 拒绝
        if (record.status === 0) {
          actions.push(
            <Popconfirm
              key="pass"
              title="确认审核通过？"
              onConfirm={() =>
                reviewMutation.mutate({ id: record.id, pass: true })
              }
              okText="通过"
              cancelText="取消"
            >
              <a style={{ color: "var(--color-jade-deep)" }}>
                <CheckOutlined /> 通过
              </a>
            </Popconfirm>,
          );
          actions.push(
            <Popconfirm
              key="reject"
              title="确认拒绝该售后申请？"
              onConfirm={() =>
                reviewMutation.mutate({ id: record.id, pass: false })
              }
              okText="拒绝"
              okButtonProps={{ danger: true }}
              cancelText="取消"
            >
              <a style={{ color: "var(--color-rose)" }}>
                <CloseOutlined /> 拒绝
              </a>
            </Popconfirm>,
          );
        }
        // 审核通过：完成
        if (record.status === 1) {
          actions.push(
            <Popconfirm
              key="complete"
              title="确认完成该售后？"
              onConfirm={() => completeMutation.mutate(record.id)}
              okText="完成"
              cancelText="取消"
            >
              <a>完成</a>
            </Popconfirm>,
          );
        }
        // 删除
        actions.push(
          <Popconfirm
            key="delete"
            title="确认删除该售后单？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
          >
            <a style={{ color: "var(--color-rose)" }}>删除</a>
          </Popconfirm>,
        );
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
          <h2 style={{ fontSize: 18, margin: 0 }}>售后管理</h2>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--color-ink-3)",
              marginTop: 3,
            }}
          >
            处理退款/退货售后申请，跟踪状态流转
          </p>
        </div>
      </div>

      <Card
        styles={{ body: { padding: 20 } }}
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        {/* 筛选栏 */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <Input
            placeholder="订单ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 180 }}
            allowClear
          />
          <Input
            placeholder="客户ID"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 180 }}
            allowClear
          />
          <Select
            placeholder="全部状态"
            value={status}
            onChange={(v) => setStatus(v)}
            style={{ width: 130 }}
            allowClear
            options={[
              { value: 0, label: "申请中" },
              { value: 1, label: "审核通过" },
              { value: 2, label: "已完成" },
              { value: 3, label: "已拒绝" },
            ]}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            style={{ height: 37, borderRadius: 11 }}
          >
            查询
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            style={{ height: 37, borderRadius: 11 }}
          >
            重置
          </Button>
        </div>

        {/* 表格 */}
        <Table<AfterSaleVO>
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={data?.records ?? []}
          pagination={{
            current: page,
            pageSize,
            total: data?.total ?? 0,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>
    </div>
  );
}
