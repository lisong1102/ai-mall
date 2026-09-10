"use client";

import { useQuery } from "@tanstack/react-query";
import { mallFetch, type PageResult } from "@/lib/mall";

interface Category {
  id: string;
  name: string;
}

/**
 * P1.7 验证组件：浏览器 → TanStack Query → mallFetch → BFF /api/mall/categories → Java。
 */
export default function CategoryList() {
  const { data, isPending, error } = useQuery({
    queryKey: ["categories", { page: 1, size: 5 }],
    queryFn: () => mallFetch<PageResult<Category>>("/categories?page=1&size=5"),
    enabled: true, // 开启默认请求
  });

  if (isPending) return <p className="text-sm text-zinc-500">类目加载中…</p>;
  if (error)
    return (
      <p className="text-sm text-red-500">类目加载失败：{error.message}</p>
    );

  return (
    <div className="text-sm text-zinc-700 dark:text-zinc-300">
      <p className="mb-2 font-medium">
        客户端请求验证（TanStack Query → BFF）：共 {data.total} 个类目
      </p>
      <ul className="list-inside list-disc space-y-1">
        {data.records.map((c) => (
          <li key={String(c.id)}>{c.name}</li>
        ))}
      </ul>
    </div>
  );
}
