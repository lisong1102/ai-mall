import { jwtVerify, type JWTPayload } from "jose";

/**
 * AI 服务端 JWT 验证：与 mall-api 共享同一个 HS256 密钥。
 *
 * route 层调用 verifyAuth(req) 解析当前用户，
 * 失败时返回 null（route 自行决定 401 还是匿名）。
 */

export interface AuthUser {
  userId: string;
  username: string;
}

let cachedKey: Uint8Array | null = null;

function getSecretKey(): Uint8Array {
  if (!cachedKey) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET 未配置");
    cachedKey = new TextEncoder().encode(secret);
  }
  return cachedKey;
}

/**
 * 从 Request 的 Authorization 头解析 JWT，返回用户信息。
 * token 缺失/过期/签名错误均返回 null。
 */
export async function verifyAuth(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) return null;

  const token = header.substring(7).trim();
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return extractUser(payload);
  } catch (e) {
    console.error(e);
    return null;
  }
}

function extractUser(payload: JWTPayload): AuthUser {
  const userId = payload.sub;
  const username = payload.username as string | undefined;
  if (!userId || !username) return null!;
  return { userId, username };
}

/**
 * 从 Request 解析用户，未登录返回 401 Response（route 直接 return 即可）。
 * 用法：const auth = requireAuth(req); if (auth.resp) return auth.resp;
 */
export async function requireAuth(
  req: Request,
): Promise<{ ok: true; user: AuthUser } | { ok: false; resp: Response }> {
  const user = await verifyAuth(req);
  if (!user) {
    return {
      ok: false,
      resp: Response.json(
        { code: 401, message: "未登录或登录已过期" },
        { status: 401 },
      ),
    };
  }
  return { ok: true, user };
}
