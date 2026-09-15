import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getMe, login as loginApi } from "@/api/mall/auth";
import type { AdminUser, LoginReq } from "@/api/mall/types";
import { clearToken, getToken, setToken } from "./auth-token";

interface AuthContextValue {
  user: AdminUser | null;
  /** 已登录（存在有效用户信息） */
  isAuthenticated: boolean;
  /** 启动时用本地 token 拉取用户信息，未完成前为 true */
  initializing: boolean;
  login: (req: LoginReq) => Promise<AdminUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 全局登录态：token 持久化在 localStorage（刷新/换标签不丢），
 * user 信息保存在内存，应用挂载时凭 token 调 /auth/me 恢复。
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setInitializing(false);
      return;
    }
    // 有 token 则拉取当前用户以恢复登录态；401 时拦截器会自动清 token 并跳登录页
    getMe()
      .then(setUser)
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setInitializing(false));
  }, []);

  const login = useCallback(async (req: LoginReq) => {
    const resp = await loginApi(req);
    setToken(resp.token);
    setUser(resp.user);
    return resp.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      initializing,
      login,
      logout,
    }),
    [user, initializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须在 <AuthProvider> 内使用");
  return ctx;
}
