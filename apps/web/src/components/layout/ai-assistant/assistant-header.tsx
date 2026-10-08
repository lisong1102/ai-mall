import { useState, type CSSProperties } from "react";
import { Avatar, Dropdown, message, Modal, Spin } from "antd";
import type { MenuProps } from "antd";
import {
  RobotOutlined,
  PlusOutlined,
  DownOutlined,
  HistoryOutlined,
  DeleteOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import {
  listConversations,
  type ConversationItem,
} from "@/api/ai/conversation";
import { useAssistantStore } from "@/store/use-assistant-store";

interface AssistantHeaderProps {
  /** 当前会话 id，用于下拉中高亮 */
  activeId?: string;
  /** 选中某个历史会话 */
  onSelect: (id: string) => void;
  /** 删除历史会话 */
  deleteConversation: (id: string) => void;
  /** 新建会话 */
  onNew: () => void;
}

/** 透明图标按钮（保持原有视觉） */
const iconBtnStyle: CSSProperties = {
  padding: 7,
  borderRadius: 9,
  border: "none",
  background: "transparent",
  color: "var(--color-ink-3)",
  cursor: "pointer",
};

/** 茶茶助手顶部栏：身份信息 + 连接状态 + 新建会话 + 历史会话下拉 */
export default function AssistantHeader({
  activeId,
  onSelect,
  onNew,
  deleteConversation,
}: AssistantHeaderProps) {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const closeAssistant = useAssistantStore((s) => s.closeAssistant);

  // 下拉展开时拉取最新会话列表；每次展开都刷新，保证新建/聊完后即时出现
  const handleOpenChange = async (open: boolean) => {
    if (!open) return;
    setLoading(true);
    try {
      setItems(await listConversations());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "__history_title",
      label: "历史会话",
      type: "group",
    },
    ...(loading
      ? [
          {
            key: "__loading",
            label: (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <Spin size="small" /> 加载中…
              </span>
            ),
            disabled: true,
          },
        ]
      : items.length === 0
        ? [
            {
              key: "__empty",
              label: "暂无历史会话",
              disabled: true,
            },
          ]
        : items.map((c) => ({
            key: c.id,
            label: c.title,
            extra: (
              <DeleteOutlined
                style={iconBtnStyle}
                onClick={() => {
                  Modal.confirm({
                    title: "确认删除吗？",
                    okText: "确认",
                    okType: "danger",
                    onOk: async () => {
                      await deleteConversation(c.id);
                      message.success("删除成功");
                    },
                  });
                  // switchConversation(c.id);
                }}
              />
            ),
          }))),
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "16px 18px",
        borderBottom: "1px solid var(--color-line-soft)",
        background:
          "linear-gradient(120deg, rgba(253,238,225,.7), rgba(255,255,255,0) 60%)",
      }}
    >
      <Avatar
        size={38}
        style={{
          background: "linear-gradient(140deg, #f6b27f, #e8854a)",
          borderRadius: 12,
          boxShadow: "var(--shadow-apricot)",
        }}
        icon={<RobotOutlined style={{ fontSize: 19 }} />}
      />
      <div>
        <b style={{ fontSize: 14, display: "block" }}>茶茶 · AI 运营助手</b>
        <div
          style={{
            fontSize: 11,
            color: "var(--color-ink-3)",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--color-jade)",
              boxShadow: "0 0 0 3px var(--color-jade-soft)",
            }}
          />
          已连接 mall-api · 可查订单 / 办售后
        </div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
        <button style={iconBtnStyle} onClick={onNew} title="新建会话">
          <PlusOutlined />
        </button>
        <Dropdown
          trigger={["click"]}
          onOpenChange={handleOpenChange}
          menu={{
            items: menuItems,
            selectedKeys: activeId ? [activeId] : [],
            onClick: ({ key }) => {
              if (key.startsWith("__")) return;
              onSelect(key);
            },
          }}
        >
          <button style={iconBtnStyle} title="历史会话">
            <DownOutlined />
          </button>
        </Dropdown>
        <button style={iconBtnStyle} title="关闭助手" onClick={closeAssistant}>
          <CloseOutlined />
        </button>
      </div>
    </div>
  );
}
