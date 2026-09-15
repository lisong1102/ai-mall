import { z } from "zod";

/**
 * AI 服务统一响应包装（与 Java 端 Result 形态一致）。
 * route 层调 jsonOk / jsonError 即可，避免重复样板。
 */
export interface Result<T> {
  code: number;
  message: string;
  data?: T;
}

/** 业务成功（code 0），HTTP 200 */
export function jsonOk<T>(data?: T): Response {
  return Response.json({ code: 0, message: "ok", data } satisfies Result<T>);
}

/**
 * 业务失败 / 参数错误统一出口。
 * @param code 业务码（非 0）；HTTP 状态码默认与 code 一致，可覆盖
 */
export function jsonError(
  code: number,
  message: string,
  httpStatus: number = code,
  extra?: Record<string, unknown>,
): Response {
  return Response.json({ code, message, ...extra } satisfies Result<never>, {
    status: httpStatus,
  });
}

/**
 * 解析 + zod 校验 JSON 请求体。
 * route 层只需 `const r = await parseJsonBody(req, schema); if (!r.ok) return r.resp;`
 *
 * 失败场景：
 * - Content-Type 不是 application/json → 415
 * - JSON 解析失败（空 body / 非 JSON）→ 400
 * - zod 校验失败（缺字段 / 类型错）→ 422
 */
export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; resp: Response }> {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return {
      ok: false,
      resp: jsonError(415, "需要 application/json", 415),
    };
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch (e) {
    return {
      ok: false,
      resp: jsonError(400, `JSON 解析失败：${(e as Error).message}`, 400),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      resp: jsonError(422, "参数校验失败", 422, {
        errors: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      }),
    };
  }

  return { ok: true, data: parsed.data };
}

/**
 * 把一个异步生成器包装成 SSE Response。
 *
 * - 每个 yield 值推一帧 `data: <json>\n\n`
 * - 正常结束推 `data: [DONE]\n\n`
 * - 生成器抛错推 `data: {"error":"..."}\n\n`（HTTP 状态码仍是 200，错误走流内事件）
 * - 客户端断开（signal abort）时 gen.return() 停止上游模型调用，省 token
 *
 * route 层用法：
 *   return sseResponse(chatService.stream(data), { signal: req.signal });
 */
export function sseResponse<T>(
  gen: AsyncGenerator<T>,
  options?: { signal?: AbortSignal },
): Response {
  const encoder = new TextEncoder();
  const signal = options?.signal;

  // 创建一个 ReadableStream，用于推送 SSE 响应
  // 有很多方法controller，比如 enqueue、close、error 等，用于控制流的读取和写入状态
  // 队列添加一次，就会向客户端推送一次数据
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      // 客户端主动断开（关 tab / 前端 abort）→ 通知生成器停止
      signal?.addEventListener("abort", () => {
        // 在 chatService.stream 当前挂起的 yield 处强制 return：
        // 退出其内部 for await 并 cancel LangChain 流，停止模型调用，有生成器链，会继续向上传递 abort 信号
        gen.return(undefined).catch(() => {});
        close();
      });

      try {
        for await (const ev of gen) {
          if (closed) break;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        }
        if (!closed) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
      } catch (e) {
        if (!closed) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: (e as Error).message })}\n\n`,
            ),
          );
        }
      } finally {
        close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
