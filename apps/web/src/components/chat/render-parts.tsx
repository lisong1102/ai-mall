import { Fragment, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MessagePart } from "@/api/ai/chat";
import { ApprovalCard } from "./ApprovalCard";
import { renderComponent } from "./component-registry";

/** parts → ReactNode：文本走 Markdown，审批/组件查注册表。渲染顺序 = 数组顺序 */
export function renderParts(parts: MessagePart[]): ReactNode {
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "text") {
          return p.text ? (
            <div key={i} className="md-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {p.text}
              </ReactMarkdown>
            </div>
          ) : null;
        }
        if (p.type === "approval")
          return <ApprovalCard key={i} approval={p.approval} />;
        if (p.type === "component")
          return (
            <Fragment key={i}>{renderComponent(p.name, p.props)}</Fragment>
          );
        return null;
      })}
    </>
  );
}
