import { useQuery } from "@tanstack/react-query";
import { pageCategories } from "@/api/mall";

/**
 * 联调验证组件：浏览器 → TanStack Query → api 层 → /api/mall/categories → Java。
 */
export default function CategoryList() {
  const { data, isPending, error } = useQuery({
    queryKey: ["categories", { page: 1, size: 5 }],
    queryFn: () => pageCategories({ page: 1, size: 5 }),
  });

  if (isPending) return <p className="text-sm text-zinc-500">类目加载中…</p>;
  if (error)
    return (
      <p className="text-sm text-red-500">类目加载失败：{error.message}</p>
    );

  return (
    <div className="text-sm text-zinc-700 dark:text-zinc-300">
      <p className="mb-2 font-medium">
        客户端请求验证（TanStack Query → api 层 → Java 直连）：共 {data.total}{" "}
        个类目
      </p>
      <ul className="list-inside list-disc space-y-1">
        {data.records.map((c) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
    </div>
  );
}
