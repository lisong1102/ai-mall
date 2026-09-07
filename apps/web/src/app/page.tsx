type HealthResult = {
  code: number;
  message: string;
  data: { status: string; service: string } | null;
};

async function getHealth(): Promise<HealthResult> {
  const base = process.env.MALL_API_BASE ?? "http://localhost:8080";
  try {
    const res = await fetch(`${base}/api/health`, { cache: "no-store" });
    return await res.json();
  } catch {
    return { code: 503, message: "mall-api 不可达", data: null };
  }
}

export default async function Home() {
  const health = await getHealth();
  const up = health.code === 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex w-full max-w-xl flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          ai-mall · P0 脚手架
        </h1>

        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-3 w-3 rounded-full ${up ? "bg-green-500" : "bg-red-500"}`}
          />
          <p className="text-zinc-700 dark:text-zinc-300">
            Java 业务服务（mall-api）：
            {up ? `已连接 · ${health.data?.service}` : health.message}
          </p>
        </div>

        <p className="text-sm text-zinc-500">
          本页由服务端直接请求 Java /api/health 渲染；客户端联调请走 BFF：
          <code className="mx-1 rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            /api/mall/health
          </code>
        </p>

        <p className="text-sm text-zinc-500">
          启动方式见根目录 README 与 docs/progress.md
        </p>
      </main>
    </div>
  );
}
