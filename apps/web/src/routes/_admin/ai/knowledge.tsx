import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  Button,
  Upload,
  Table,
  Tag,
  Modal,
  App as AntdApp,
  Space,
  type UploadProps,
} from "antd";
import {
  UploadOutlined,
  BookOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  listDocuments,
  uploadDocument,
  deleteDocument,
  downloadDocument,
  type KnowledgeDocument,
  type DocumentStatus,
} from "@/api/ai";

export const Route = createFileRoute("/_admin/ai/knowledge")({
  component: AIKnowledge,
});

/** 状态 → Tag 颜色 + 文案 */
const STATUS_META: Record<DocumentStatus, { color: string; text: string }> = {
  processing: { color: "orange", text: "处理中" },
  ready: { color: "green", text: "已就绪" },
  failed: { color: "red", text: "失败" },
};

function AIKnowledge() {
  const queryClient = useQueryClient();
  const { message } = AntdApp.useApp();

  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => listDocuments({ size: 100 }),
    // 列表中存在 processing 项时持续轮询；全 ready/failed 时停
    refetchInterval: (query) => {
      const list = query.state.data?.list ?? [];
      return list.some((d) => d.status === "processing") ? 3000 : false;
    },
  });
  const docs = data?.list ?? [];

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocument(file),
    onSuccess: () => {
      message.success("上传成功");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: Error) => message.error(`上传失败：${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      message.success("已删除");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: Error) => message.error(`删除失败：${e.message}`),
  });

  const uploadProps: UploadProps = {
    accept: ".pdf,.docx,.md,.markdown,.txt",
    showUploadList: false,
    disabled: uploadMutation.isPending,
    beforeUpload: (file) => {
      // 直接走 mutation，返回 false 阻止 antd 默认 action 上传
      uploadMutation.mutate(file);
      return false;
    },
  };

  const handleDelete = (doc: KnowledgeDocument) => {
    Modal.confirm({
      title: "删除文档",
      content: `确定删除「${doc.fileName}」？关联的切片与向量也会一并清除。`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => deleteMutation.mutateAsync(doc.id),
    });
  };

  const handleDownload = async (doc: KnowledgeDocument) => {
    try {
      const blob = await downloadDocument(doc.id, true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      message.error(`下载失败：${(e as Error).message}`);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "var(--color-paper)",
          border: "1px solid var(--color-line)",
          borderRadius: "var(--radius-lg)",
          padding: "14px 18px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "var(--color-apricot)",
                boxShadow: "0 0 0 4px var(--color-apricot-soft)",
              }}
            />
            知识库
          </h2>
          <div
            style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 2 }}
          >
            上传文档与资料，让 AI 基于你的私有知识回答与生成
          </div>
        </div>
        <Upload {...uploadProps}>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            loading={uploadMutation.isPending}
            style={{
              marginLeft: "auto",
              height: 37,
              borderRadius: 11,
              fontWeight: 600,
            }}
          >
            上传文档
          </Button>
        </Upload>
      </div>

      <Card
        styles={{ body: { padding: 0 } }}
        style={{
          flex: 1,
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        {docs.length === 0 && !isLoading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                margin: "0 auto 16px",
                display: "grid",
                placeItems: "center",
                background: "var(--color-apricot-soft)",
                color: "var(--color-apricot-deep)",
              }}
            >
              <BookOutlined style={{ fontSize: 30 }} />
            </div>
            <h3 style={{ fontSize: 16, marginBottom: 6 }}>知识库还是空的</h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--color-ink-3)",
                maxWidth: 380,
                margin: "0 auto",
              }}
            >
              支持上传 PDF / Word / Markdown / TXT，自动切片向量化，在 AI
              对话中按知识库检索回答。
            </p>
          </div>
        ) : (
          <Table<KnowledgeDocument>
            rowKey="id"
            loading={isLoading}
            dataSource={docs}
            pagination={false}
            scroll={{ y: "calc(100vh - 280px)" }}
            style={{ padding: 4 }}
            columns={[
              {
                title: "文件名",
                dataIndex: "fileName",
                key: "fileName",
                render: (name: string) => (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <FileTextOutlined style={{ color: "var(--color-ink-3)" }} />
                    <span style={{ fontWeight: 500 }}>{name}</span>
                  </span>
                ),
              },
              {
                title: "状态",
                dataIndex: "status",
                key: "status",
                width: 110,
                render: (status: DocumentStatus) => {
                  const m = STATUS_META[status];
                  return <Tag color={m.color}>{m.text}</Tag>;
                },
              },
              {
                title: "切片数",
                dataIndex: "chunkCount",
                key: "chunkCount",
                width: 90,
                align: "center",
              },
              {
                title: "创建时间",
                dataIndex: "createdAt",
                key: "createdAt",
                width: 180,
                render: (v: string) => new Date(v).toLocaleString("zh-CN"),
              },
              {
                title: "操作",
                key: "action",
                width: 130,
                align: "center",
                render: (_: unknown, doc: KnowledgeDocument) => (
                  <Space size={0}>
                    <Button
                      size="small"
                      type="text"
                      icon={<DownloadOutlined />}
                      disabled={!doc.filePath || doc.status !== "ready"}
                      onClick={() => handleDownload(doc)}
                    />
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      loading={
                        deleteMutation.isPending &&
                        deleteMutation.variables === doc.id
                      }
                      onClick={() => handleDelete(doc)}
                    />
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
