import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Card, Input, Button, Table, Modal, Form, message } from "antd";
import type { TableProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  createCustomer,
  deleteCustomer,
  pageCustomers,
  updateCustomer,
} from "@/api/mall";
import type { Customer, CustomerSaveReq } from "@/api/mall";
import dayjs from "dayjs";

export const Route = createFileRoute("/_admin/customers")({
  component: Customers,
});

function Customers() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  // 当前编辑的客户 ID：null=新增模式，string=编辑模式
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  // 每页条数固定（表格未开启 showSizeChanger）
  const [size] = useState(8);
  // 搜索关键字（姓名或手机号模糊匹配；与 queryKey 联动）
  const [searchName, setSearchName] = useState("");
  const [form] = Form.useForm<CustomerSaveReq>();

  const { data: customers, isFetching: loading } = useQuery({
    queryKey: ["customers", page, size, searchName],
    queryFn: () => pageCustomers({ size, page, name: searchName || undefined }),
    placeholderData: keepPreviousData,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["customers"] });

  // 新增客户
  const createMutation = useMutation({
    mutationFn: (values: CustomerSaveReq) => createCustomer(values),
    onSuccess: (id) => {
      message.success(`新增成功，ID：${id}`);
      closeModal();
      invalidate();
    },
    onError: (e: Error) => message.error(e.message),
  });

  // 编辑客户
  const updateMutation = useMutation({
    mutationFn: (values: CustomerSaveReq) => updateCustomer(editingId!, values),
    onSuccess: () => {
      message.success("修改成功");
      closeModal();
      invalidate();
    },
    onError: (e: Error) => message.error(e.message),
  });

  // 删除客户（经 Modal.confirm 确认）
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => {
      message.success("删除成功");
      invalidate();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const closeModal = () => {
    setModalOpen(false);
    form.resetFields();
    setEditingId(null);
  };

  const openCreate = () => {
    form.resetFields();
    setEditingId(null);
    setModalOpen(true);
  };

  // 编辑：用行数据回填表单（Customer 已含全部字段）
  const openEdit = (r: Customer) => {
    form.resetFields();
    form.setFieldsValue({
      name: r.name,
      phone: r.phone ?? undefined,
      email: r.email ?? undefined,
      address: r.address ?? undefined,
    });
    setEditingId(r.id);
    setModalOpen(true);
  };

  const confirmDelete = (r: Customer) => {
    Modal.confirm({
      title: "删除客户",
      content: `确定删除「${r.name}」吗？该操作不可恢复。`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await deleteMutation.mutateAsync(r.id);
      },
    });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    // 空串归一为 undefined，避免提交无意义的空字段
    const payload: CustomerSaveReq = {
      name: values.name,
      phone: values.phone || undefined,
      email: values.email || undefined,
      address: values.address || undefined,
    };
    if (editingId) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns: TableProps<Customer>["columns"] = [
    {
      title: "客户",
      dataIndex: "name",
      key: "name",
      render: (_, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              background: "linear-gradient(140deg, #8fd8b6, #3a9f73)",
            }}
          >
            {(r.name ?? "?").charAt(0)}
          </span>
          <div>
            <b style={{ fontWeight: 600, display: "block" }}>{r.name}</b>
            <span style={{ fontSize: 11.5, color: "var(--color-ink-3)" }}>
              ID: {r.id}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "手机号",
      dataIndex: "phone",
      key: "phone",
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "地址",
      dataIndex: "address",
      key: "address",
      ellipsis: true,
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      className: "num",
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "",
      key: "action",
      align: "right",
      render: (_, r) => (
        <>
          <a
            style={{
              color: "var(--color-jade-deep)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              marginRight: 8,
            }}
            onClick={() => openEdit(r)}
          >
            编辑
          </a>
          <a
            style={{
              color: "var(--color-rose)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => confirmDelete(r)}
          >
            删除
          </a>
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
          <h2 style={{ fontSize: 18, margin: 0 }}>客户管理</h2>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--color-ink-3)",
              marginTop: 3,
            }}
          >
            共 {customers?.total ?? 0} 位客户，维护客户基础信息
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          style={{ height: 37, borderRadius: 11, fontWeight: 600 }}
        >
          新增客户
        </Button>
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
            placeholder="姓名 / 手机号关键词"
            style={{ width: 190 }}
            value={searchName}
            onChange={(e) => {
              setSearchName(e.target.value);
              setPage(1);
            }}
            allowClear
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

        <Table<Customer>
          rowKey="id"
          columns={columns}
          dataSource={customers?.records || []}
          loading={loading}
          pagination={{
            pageSize: size,
            showSizeChanger: false,
            current: page,
            onChange: (p) => setPage(p),
            showTotal: (t) =>
              `共 ${t} 条 · 第 ${page} / ${Math.ceil((customers?.total || 0) / size)} 页`,
          }}
        />
      </Card>

      {/* 新增/编辑客户弹窗 */}
      <Modal
        title={editingId ? "编辑客户" : "新增客户"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            label="客户姓名"
            name="name"
            rules={[{ required: true, message: "请输入客户姓名" }]}
          >
            <Input placeholder="如：李明" maxLength={64} />
          </Form.Item>
          <Form.Item
            label="手机号"
            name="phone"
            rules={[{ pattern: /^1\d{10}$/, message: "请输入 11 位手机号" }]}
          >
            <Input placeholder="如：13800138000" maxLength={11} />
          </Form.Item>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[{ type: "email", message: "邮箱格式不正确" }]}
          >
            <Input placeholder="如：liming@example.com" maxLength={128} />
          </Form.Item>
          <Form.Item label="地址" name="address">
            <Input.TextArea
              rows={2}
              maxLength={255}
              placeholder="收货 / 联系地址"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
