# AI 服务：Next.js standalone 产物，纯 API（/api/chat、/api/health 等）
# 构建上下文为仓库根目录（standalone tracing root 为仓库根）

FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/ai/package.json apps/ai/
COPY apps/web/package.json apps/web/
RUN pnpm install --filter ai --frozen-lockfile
COPY apps/ai apps/ai
RUN pnpm --filter ai build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    HOSTNAME=0.0.0.0
# standalone 产物按 monorepo 结构输出：server.js 位于 apps/ai/ 下
COPY --from=build /repo/apps/ai/.next/standalone ./
COPY --from=build /repo/apps/ai/.next/static ./apps/ai/.next/static
# 拷贝 Drizzle 迁移文件与配置，供启动时执行 migrate
COPY --from=build /repo/apps/ai/drizzle ./apps/ai/drizzle
COPY --from=build /repo/apps/ai/drizzle.config.ts ./apps/ai/drizzle.config.ts
RUN npm install -g drizzle-kit@0.31.10
# 启动脚本：先执行 Drizzle 迁移，再启动 Next.js 服务
RUN printf '#!/bin/sh\nset -e\ncd /app/apps/ai\necho "[ai-service] running drizzle migrations..."\nDATABASE_URL="$DATABASE_URL" drizzle-kit migrate\ncd /app\necho "[ai-service] starting next.js server..."\nexec node apps/ai/server.js\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh
EXPOSE 3001
CMD ["/app/entrypoint.sh"]
