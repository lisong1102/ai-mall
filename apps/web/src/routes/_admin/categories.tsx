import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Input,
  Button,
  Table,
  Modal,
  Form,
  TreeSelect,
  message,
  Popconfirm,
  Space,
} from "antd";
import type { TreeSelectProps } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { TableProps } from "antd";
import {
  pageCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
} from "@/api/mall";
import type { Category, CategorySaveReq, CategoryTreeNode } from "@/api/mall";
import dayjs from "dayjs";

export const Route = createFileRoute("/_admin/categories")({
  component: Categories,
});

/**
 * 后端类目树 {id,name,children} 映射为 TreeSelect 需要的 {value,title,children}。
 * 编辑时禁用当前类目自身及其子孙节点，避免把父类目挂到自己或自己的下级（成环）。
 */
function toTreeSelectData(
  nodes: CategoryTreeNode[],
  disabledId?: string,
  forceDisabled = false,
): NonNullable<TreeSelectProps["treeData"]> {
  return nodes.map((n) => {
    const selfDisabled = forceDisabled || n.id === disabledId;
    return {
      value: n.id,
      title: n.name,
      disabled: selfDisabled,
      children: n.children?.length
        ? toTreeSelectData(n.children, disabledId, selfDisabled)
        : undefined,
    };
  });
}

function Categories() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form] = Form.useForm<CategorySaveReq>();

  // 查询类目列表
  const { data, isLoading } = useQuery({
    queryKey: ["categories", page, pageSize, name],
    queryFn: () =>
      pageCategories({ page, size: pageSize, name: name || undefined }),
  });

  // 类目树（弹窗打开时才请求；新增/删除后随 ["categories"] 一起失效刷新）
  const { data: categoryTree, isFetching: treeLoading } = useQuery({
    queryKey: ["categories", "tree"],
    queryFn: getCategoryTree,
    enabled: modalOpen,
  });

  // 编辑时禁用自身及子孙节点，防止父类目成环
  const parentTreeData = useMemo(
    () => (categoryTree ? toTreeSelectData(categoryTree, editing?.id) : []),
    [categoryTree, editing],
  );

  // 新增/编辑
  const saveMutation = useMutation({
    mutationFn: async (values: CategorySaveReq) => {
      if (editing) {
        await updateCategory(editing.id, values);
      } else {
        await createCategory(values);
      }
    },
    onSuccess: () => {
      message.success(editing ? "修改成功" : "新增成功");
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      message.success("删除成功");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ parentId: "0", sort: 0 });
    setModalOpen(true);
  };

  const openEdit = (record: Category) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      parentId: record.parentId,
      sort: record.sort,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    saveMutation.mutate(values);
  };

  const handleSearch = () => {
    setPage(1);
  };

  const handleReset = () => {
    setName("");
    setPage(1);
  };

  const columns: TableProps<Category>["columns"] = [
    {
      title: "类目名称",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "父类目ID",
      dataIndex: "parentId",
      key: "parentId",
      width: 140,
      render: (v: string) => v,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "操作",
      key: "action",
      width: 160,
      render: (_, record) => (
        <Space size={12}>
          <a onClick={() => openEdit(record)}>编辑</a>
          <Popconfirm
            title="确认删除该类目？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
          >
            <a style={{ color: "var(--color-rose)" }}>删除</a>
          </Popconfirm>
        </Space>
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
          <h2 style={{ fontSize: 18, margin: 0 }}>类目管理</h2>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--color-ink-3)",
              marginTop: 3,
            }}
          >
            维护商品类目层级与排序
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          style={{ height: 37, borderRadius: 11, fontWeight: 600 }}
        >
          新增类目
        </Button>
      </div>

      <Card
        styles={{ body: { padding: 20 } }}
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
            placeholder="类目名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 200 }}
            allowClear
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
        <Table<Category>
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

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editing ? "编辑类目" : "新增类目"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
          setEditing(null);
        }}
        confirmLoading={saveMutation.isPending}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            label="类目名称"
            name="name"
            rules={[{ required: true, message: "请输入类目名称" }]}
          >
            <Input placeholder="如：手机数码" maxLength={50} />
          </Form.Item>
          <Form.Item
            label="父类目"
            name="parentId"
            rules={[{ required: true, message: "请选择父类目" }]}
          >
            <TreeSelect
              treeData={parentTreeData}
              loading={treeLoading}
              placeholder="顶级类目请选择「根类目」"
              showSearch
              treeDefaultExpandAll
              allowClear={false}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
