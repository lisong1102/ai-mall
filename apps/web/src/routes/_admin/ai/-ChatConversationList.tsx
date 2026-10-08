import { listConversations } from "@/api/ai";
import {
  DeleteOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Conversations } from "@ant-design/x";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Spin } from "antd";

interface ChatConversationListProps {
  activeId?: string;
  onSelect: (id: string) => void;
  deleteConversation: (id: string) => Promise<void>;
  onNew: () => void;
}
export default function ChatConversationList({
  activeId,
  onSelect,
  deleteConversation,
  onNew,
}: ChatConversationListProps) {
  const queryClient = useQueryClient();
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      return await listConversations();
    },
  });

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  return (
    <Spin spinning={isLoading}>
      <div
        style={{
          background: "var(--color-paper)",
          border: "1px solid var(--color-line)",
          borderRadius: "var(--radius-lg)",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onNew}
          style={{
            background: "linear-gradient(140deg, #f6b27f, #e8854a)",
            border: "none",
            borderRadius: 11,
            height: 38,
            fontWeight: 600,
            boxShadow: "0 6px 14px -5px rgba(232,133,74,.6)",
          }}
        >
          新建会话
        </Button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginTop: 10,
            background: "#f7faf8",
            border: "1px solid var(--color-line)",
            borderRadius: 10,
            padding: "2px 10px",
            color: "var(--color-ink-3)",
          }}
        >
          <SearchOutlined style={{ fontSize: 14 }} />
          <Input placeholder="搜索历史会话…" variant="borderless" />
        </div>
        <div style={{ flex: 1, overflowY: "auto", marginTop: 10 }}>
          <Conversations
            activeKey={activeId}
            onActiveChange={onSelect}
            menu={(item) => ({
              items: [
                {
                  key: "delete",
                  label: "删除",
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => handleDelete(item.key as string),
                },
              ],
              trigger: <MoreOutlined style={{ color: "var(--color-ink-3)" }} />,
            })}
            items={conversations?.map((c) => ({
              key: c.id,
              label: c.title,
            }))}
          />
        </div>
      </div>
    </Spin>
  );
}
