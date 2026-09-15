import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ConfigProvider, App as AntdApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useState } from "react";
import { themeConfig } from "@/theme";
import { AuthProvider } from "@/lib/auth";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );

  return (
    <ConfigProvider theme={themeConfig} locale={zhCN}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <div className="ambient-bg">
              <i></i>
              <i></i>
              <i></i>
            </div>
            <Outlet />
          </AuthProvider>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}
