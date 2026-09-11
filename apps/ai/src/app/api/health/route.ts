export const runtime = "nodejs";

/**
 * AI 服务健康检查：供 nginx 上游探测与容器 healthcheck 使用。
 */
export function GET() {
  return Response.json({
    code: 0,
    message: "ok",
    data: { status: "up", service: "ai-service" },
  });
}
