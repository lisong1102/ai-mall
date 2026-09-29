import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Card,
  Input,
  Select,
  Button,
  Tag,
  Table,
  Modal,
  Form,
  InputNumber,
  Switch,
  message,
} from "antd";
import type { TableProps } from "antd";
import { PlusOutlined, ThunderboltOutlined } from "@ant-design/icons";
import {
  createProduct,
  pageCategories,
  pageProducts,
  updateProduct,
  updateProductStatus,
} from "@/api/mall";
import type { ProductSaveReq, ProductVO } from "@/api/mall";
import dayjs from "dayjs";

/** 根据后端 status(1上架/0下架) 与库存派生展示文本与 Tag 颜色 */
function getStatusInfo(p: ProductVO): {
  text: string;
  color: "green" | "gray" | "rose";
} {
  if (p.stock === 0) return { text: "缺货", color: "rose" };
  return p.status === 1
    ? { text: "在售", color: "green" }
    : { text: "已下架", color: "gray" };
}

/** 取商品名首字作为缩略图文字 */
function getThumb(p: ProductVO): { text: string; bg: string } {
  const text = p.name?.[0] ?? "?";
  const bg =
    p.stock === 0
      ? "linear-gradient(140deg, #f0a5a5, #d96b6b)"
      : p.status === 1
        ? "linear-gradient(140deg, #6fc7a3, #2e9e72)"
        : "linear-gradient(140deg, #b8c0cc, #8a93a0)";
  return { text, bg };
}

export const Route = createFileRoute("/_admin/products")({
  component: Products,
});

function Products() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  // 当前编辑的商品 ID：null=新增模式，string=编辑模式
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(8);
  // 搜索条件（与 queryKey 联动：变更即触发重新请求；查询/重置会重置回第 1 页）
  const [searchName, setSearchName] = useState("");
  const [searchStatus, setSearchStatus] = useState<"all" | "1" | "0">("all");
  const [form] = Form.useForm<ProductSaveReq>();

  const { data: products, isFetching: productLoading } = useQuery({
    queryKey: ["products", page, size, searchName, searchStatus],
    queryFn: () =>
      pageProducts({
        size,
        page,
        name: searchName || undefined,
        status: searchStatus === "all" ? undefined : Number(searchStatus),
      }),
    placeholderData: keepPreviousData,
  });

  // 类目下拉选项（弹窗打开时才请求）
  const { data: categoryPage, isFetching: categoryLoading } = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => pageCategories({ size: 200 }),
    enabled: modalOpen,
  });
  const categoryOptions = (categoryPage?.records ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  // 新增商品
  const createMutation = useMutation({
    mutationFn: (values: ProductSaveReq) => createProduct(values),
    onSuccess: (id) => {
      message.success(`新增成功，ID：${id}`);
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  // 编辑商品
  const updateMutation = useMutation({
    mutationFn: (values: ProductSaveReq) => updateProduct(editingId!, values),
    onSuccess: () => {
      message.success("修改成功");
      setModalOpen(false);
      form.resetFields();
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  // 切换上下架
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 0 | 1 }) =>
      updateProductStatus(id, status),
    onSuccess: () => {
      message.success(`切换成功`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ status: 1, stock: 0 });
    setEditingId(null);
    setModalOpen(true);
  };

  // 编辑：用行数据回填表单（ProductVO 已含全部字段）
  const openEdit = (r: ProductVO) => {
    form.resetFields();
    form.setFieldsValue({
      name: r.name,
      categoryId: r.categoryId,
      price: r.price,
      stock: r.stock,
      status: r.status,
      description: r.description ?? undefined,
      coverImage: r.coverImage ?? undefined,
    });
    setEditingId(r.id);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingId) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const columns: TableProps<ProductVO>["columns"] = [
    {
      title: "商品",
      dataIndex: "name",
      key: "name",
      render: (_, r) => {
        const thumb = getThumb(r);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                background: thumb.bg,
              }}
            >
              {thumb.text}
            </span>
            <div>
              <b style={{ fontWeight: 600, display: "block" }}>{r.name}</b>
              <span style={{ fontSize: 11.5, color: "var(--color-ink-3)" }}>
                ID: {r.id}
              </span>
            </div>
          </div>
        );
      },
    },
    { title: "类目", dataIndex: "categoryName", key: "categoryName" },
    {
      title: "价格",
      dataIndex: "price",
      key: "price",
      className: "num",
      render: (v: number) => `¥ ${v.toFixed(2)}`,
    },
    { title: "库存", dataIndex: "stock", key: "stock", className: "num" },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (_, r) => {
        const s = getStatusInfo(r);
        return (
          <Tag color={s.color} style={{ borderRadius: 999 }}>
            {s.text}
          </Tag>
        );
      },
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
      render: (_, r) => {
        const isOut = r.stock === 0;
        const isOff = r.status === 0;
        return (
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
                color: isOut ? "var(--color-jade-deep)" : "var(--color-rose)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() => {
                updateStatusMutation.mutate({
                  id: r.id,
                  status: isOff ? 1 : 0,
                });
              }}
            >
              {isOut ? "补货" : isOff ? "上架" : "下架"}
            </a>
          </>
        );
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
          <h2 style={{ fontSize: 18, margin: 0 }}>商品管理</h2>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--color-ink-3)",
              marginTop: 3,
            }}
          >
            共 24 件商品，维护商品信息、库存与上下架
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          style={{ height: 37, borderRadius: 11, fontWeight: 600 }}
        >
          新增商品
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
            placeholder="商品名称关键词"
            style={{ width: 190 }}
            value={searchName}
            onChange={(e) => {
              setSearchName(e.target.value);
              setPage(1);
            }}
            allowClear
          />
          <Select
            value={searchStatus}
            onChange={(v) => {
              setSearchStatus(v);
              setPage(1);
            }}
            style={{ width: 120 }}
            options={[
              { value: "all", label: "全部状态" },
              { value: "1", label: "在售" },
              { value: "0", label: "已下架" },
            ]}
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
              setSearchStatus("all");
              setPage(1);
            }}
          >
            重置
          </Button>
        </div>

        <Table<ProductVO>
          rowKey="id"
          columns={columns}
          dataSource={products?.records || []}
          pagination={{
            pageSize: size,
            showSizeChanger: false,
            current: page,
            onChange: (p) => setPage(p),
            showTotal: (t) =>
              `共 ${t} 条 · 第 ${page} / ${Math.ceil((products?.total || 0) / size)} 页`,
          }}
        />
      </Card>

      {/* 新增/编辑商品弹窗 */}
      <Modal
        title={editingId ? "编辑商品" : "新增商品"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
          setEditingId(null);
        }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            label="商品名称"
            name="name"
            rules={[{ required: true, message: "请输入商品名称" }]}
          >
            <Input placeholder="如：青风 Pro 智能手机" maxLength={128} />
          </Form.Item>
          <Form.Item
            label="所属类目"
            name="categoryId"
            rules={[{ required: true, message: "请选择类目" }]}
          >
            <Select
              placeholder="请选择类目"
              loading={categoryLoading}
              options={categoryOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            label="售价 (元)"
            name="price"
            rules={[{ required: true, message: "请输入售价" }]}
          >
            <InputNumber
              placeholder="如：3999.00"
              min={0}
              precision={2}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item label="库存" name="stock" initialValue={0}>
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="上下架"
            name="status"
            valuePropName="checked"
            getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
            getValueProps={(v) => ({ checked: v === 1 })}
            initialValue={1}
          >
            <Switch checkedChildren="在售" unCheckedChildren="下架" />
          </Form.Item>
          <Form.Item label="商品描述" name="description">
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
          <Form.Item label="主图 URL" name="coverImage">
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
