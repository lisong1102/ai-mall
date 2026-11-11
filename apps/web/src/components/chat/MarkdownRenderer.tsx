import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { createLowlight } from "lowlight";
import type { Root, Element, ElementContent } from "hast";
import "highlight.js/styles/github-dark.css";

// 按需导入 AI 对话最常用的语言，减小打包体积
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const lowlight = createLowlight({
  bash,
  css,
  diff,
  go,
  java,
  javascript,
  json,
  markdown,
  python,
  rust,
  sql,
  typescript,
  xml,
  yaml,
});

/**
 * 极简 rehype 代码高亮插件，只处理 pre > code 且指定了语言的场景。
 * 避免 rehype-highlight 默认全量打包 lowlight/common(~37 种语言)。
 */
function rehypeHighlightLite() {
  return (tree: Root) => {
    walk(tree);
  };
}

function walk(node: Root | Element) {
  for (const child of node.children as ElementContent[]) {
    if (child.type !== "element") continue;
    if (child.tagName === "code") {
      highlightCode(child);
    }
    walk(child);
  }
}

function highlightCode(node: Element) {
  const className = (node.properties?.className as string[] | undefined) ?? [];
  const langClass = className.find((c) => c.startsWith("language-"));
  if (!langClass) return;

  const lang = langClass.slice("language-".length);
  if (!lowlight.registered(lang)) return;

  const text = childrenToText(node);
  const result = lowlight.highlight(lang, text);

  node.children = result.children as ElementContent[];
  node.properties = node.properties ?? {};
  node.properties.className = [...className, "hljs"];
}

function childrenToText(node: Element): string {
  let text = "";
  for (const child of node.children) {
    if (child.type === "text") text += child.value;
  }
  return text;
}

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const markdown = useMemo(
    () => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeHighlightLite]}
      >
        {content}
      </ReactMarkdown>
    ),
    [content],
  );

  return <div className="md-body">{markdown}</div>;
}
