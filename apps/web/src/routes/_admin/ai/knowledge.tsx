import { createFileRoute } from "@tanstack/react-router";
import { Card, Button } from "antd";
import { UploadOutlined, BookOutlined } from "@ant-design/icons";

export const Route = createFileRoute("/_admin/ai/knowledge")({
  component: AIKnowledge,
});

function AIKnowledge() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, background: "var(--color-paper)", border: "1px solid var(--color-line)", borderRadius: "var(--radius-lg)", padding: "14px 18px", boxShadow: "var(--shadow-sm)" }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--color-apricot)", boxShadow: "0 0 0 4px var(--color-apricot-soft)" }} />
            知识库
          </h2>
          <div style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 2 }}>上传文档与资料，让 AI 基于你的私有知识回答与生成</div>
        </div>
        <Button type="primary" icon={<UploadOutlined />} style={{ marginLeft: "auto", height: 37, borderRadius: 11, fontWeight: 600 }}>
          上传文档
        </Button>
      </div>

      <Card styles={{ body: { padding: 0 } }} style={{ flex: 1, borderRadius: "var(--radius-lg)", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, margin: "0 auto 16px", display: "grid", placeItems: "center", background: "var(--color-apricot-soft)", color: "var(--color-apricot-deep)" }}>
            <BookOutlined style={{ fontSize: 30 }} />
          </div>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>知识库功能即将上线</h3>
          <p style={{ fontSize: 13, color: "var(--color-ink-3)", maxWidth: 380, margin: "0 auto" }}>
            支持上传 PDF / Word / Markdown，自动切片向量化，在 AI 对话中按知识库检索回答。当前为 UI 占位，后续迭代实现。
          </p>
        </div>
      </Card>
    </div>
  );
}
