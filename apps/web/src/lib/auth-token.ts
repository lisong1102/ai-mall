/**
 * JWT 本地存储：axios 拦截器（非 React 环境）与 AuthProvider（React 环境）
 * 共用同一把 key 与读写入口，避免散落各处的 localStorage 魔法字符串。
 */
const TOKEN_KEY = "token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
