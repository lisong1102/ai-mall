import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getAiHealth } from "@/api/ai";
import { getMallHealth } from "@/api/mall";
import CategoryList from "@/components/category-list";

export const Route = createFileRoute("/")({
  component: Home,
});

function ServiceStatus({
  label,
  isPending,
  error,
  service,
}: {
  label: string;
  isPending: boolean;
  error: Error | null;
  service?: string;
}) {
  const up = !isPending && !error;
  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-block h-3 w-3 rounded-full ${up ? "bg-green-500" : "bg-red-500"}`}
      />
      <p className="text-zinc-700 dark:text-zinc-300">
        {label}：
        {isPending
          ? "检测中…"
          : up
            ? `已连接 · ${service}`
            : (error?.message ?? "服务异常")}
      </p>
    </div>
  );
}

function Home() {
  // SPA 健康检查：浏览器 → /api/mall/health → Java；/api/ai/health → Next AI 服务
  const mall = useQuery({
    queryKey: ["mall-health"],
    queryFn: getMallHealth,
    retry: false,
  });
  const ai = useQuery({
    queryKey: ["ai-health"],
    queryFn: getAiHealth,
    retry: false,
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex w-full max-w-xl flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          ai-mall · Vite 前端
        </h1>

        <ServiceStatus
          label="Java 业务服务（mall-api）"
          isPending={mall.isPending}
          error={mall.error}
          service={mall.data?.service}
        />
        <ServiceStatus
          label="AI 服务（apps/ai）"
          isPending={ai.isPending}
          error={ai.error}
          service={ai.data?.service}
        />

        <p className="text-sm text-zinc-500">
          商城流量经 Vite proxy（线上 nginx）直连 Java：
          <code className="mx-1 rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            /api/mall/*
          </code>
          ；AI 流量走
          <code className="mx-1 rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            /api/ai/*
          </code>
          → Next AI 服务
        </p>

        <CategoryList />

        <p className="text-sm text-zinc-500">
          启动方式见根目录 README 与 docs/progress.md
        </p>
      </main>
    </div>
  );
}
