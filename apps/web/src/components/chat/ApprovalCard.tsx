import { createContext, useContext, useState } from "react";
import { Button, Input, Space, Tag, Typography } from "antd";
import type { ApprovalMeta, RefundApprovalDecision } from "@/api/ai/chat";

/** 审批动作由外层（chat.tsx）注入；未注入时按钮禁用 */
export const ApprovalActionContext = createContext<
  ((req: ApprovalMeta, approved: boolean, note?: string) => void) | null
>(null);

export function ApprovalCard({ approval }: { approval: ApprovalMeta }) {
  const onDecide = useContext(ApprovalActionContext);
  const [note, setNote] = useState("");
  const resolved = approval.status !== "pending";

  return (
    <div
      style={{
        border: "1px solid var(--color-line)",
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
        maxWidth: 380,
      }}
    >
      <Space direction="vertical" size={6} style={{ width: "100%" }}>
        <Space>
          <Tag color="orange">人工审批</Tag>
          <Typography.Text strong>退款审批请求</Typography.Text>
        </Space>
        <Typography.Text type="secondary">
          订单号：{approval.orderNo}
        </Typography.Text>
        <Typography.Text type="secondary">
          退款金额：¥{approval.amount}
        </Typography.Text>
        <Typography.Text type="secondary">
          原因：{approval.reason}
        </Typography.Text>
        {resolved ? (
          <Tag color={approval.approved ? "green" : "red"}>
            {approval.approved ? "已同意" : "已拒绝"}
            {approval.note ? `：${approval.note}` : ""}
          </Tag>
        ) : (
          <>
            <Input.TextArea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="审批备注（拒绝时建议填写原因）"
            />
            <Space>
              <Button
                type="primary"
                disabled={!onDecide}
                onClick={() => onDecide?.(approval, true, note)}
              >
                同意退款
              </Button>
              <Button
                danger
                disabled={!onDecide}
                onClick={() => onDecide?.(approval, false, note)}
              >
                拒绝
              </Button>
            </Space>
          </>
        )}
      </Space>
    </div>
  );
}
