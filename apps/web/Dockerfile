# 商城前端：Vite 构建静态产物 + nginx 托管与反向代理
# 构建上下文为仓库根目录（需要 workspace 清单与 lockfile）

FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
# 仅拷贝依赖清单，利用镜像层缓存
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/ai/package.json apps/ai/
RUN pnpm install --filter web --frozen-lockfile
COPY apps/web apps/web
RUN pnpm --filter web build

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
