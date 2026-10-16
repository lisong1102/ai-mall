import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 纯 API 服务：standalone 产物便于容器化；monorepo 下 tracing root 指向仓库根
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  // pdf-parse 内部用 pdfjs-dist，其 fake worker 会在运行时动态 import 同目录的
  // pdf.worker.mjs，打包后路径被重写导致找不到模块，必须保持为 Node 外部依赖
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
