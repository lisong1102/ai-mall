/**
 * BFF 健康检查代理：前端 → /api/mall/health → Java mall-api /api/health
 * P0 用于验证前后端互通；后续 /api/mall/* 转发层在此模式上扩展。
 */
export async function GET() {
  const base = process.env.MALL_API_BASE ?? "http://localhost:8080";

  try {
    const res = await fetch(`${base}/api/health`, { cache: "no-store" });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json(
      { code: 503, message: "mall-api 不可达，请先启动 Java 服务", data: null },
      { status: 503 },
    );
  }
}
