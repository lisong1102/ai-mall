import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 纯 API 服务：standalone 产物便于容器化；monorepo 下 tracing root 指向仓库根
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
};

export default nextConfig;
