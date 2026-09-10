import { NextRequest } from "next/server";

/**
 * BFF 统一转发：前端 → /api/mall/** → Java mall-api /api/**
 * 例：/api/mall/categories?page=1 → ${MALL_API_BASE}/api/categories?page=1
 * 保留 query 与请求体；Java 返回的 Result 包装原样透传（含 HTTP 状态码）。
 * 后续登录态（Cookie/Token）统一在此注入，前端无需感知 Java 地址。
 */
const BASE = process.env.MALL_API_BASE ?? "http://localhost:8080";

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const target = `${BASE}/api/${path.join("/")}${new URL(req.url).search}`;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.text() : undefined,
      cache: "no-store",
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return Response.json(
      { code: 503, message: "mall-api 不可达，请先启动 Java 服务", data: null },
      { status: 503 },
    );
  }
}

export {
  proxy as DELETE,
  proxy as GET,
  proxy as PATCH,
  proxy as POST,
  proxy as PUT,
};
