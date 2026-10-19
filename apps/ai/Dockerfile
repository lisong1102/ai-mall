# AI 服务：Next.js standalone 产物，纯 API（/api/chat、/api/health 等）
# 构建上下文为仓库根目录（standalone tracing root 为仓库根）

FROM node:22-alpine AS build
WORKDIR /repo
# corepack 下载 pnpm 也走 npm registry，国内服务器默认源极慢，提前切到 npmmirror
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
RUN corepack enable
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/ai/package.json apps/ai/
COPY apps/web/package.json apps/web/
RUN pnpm config set registry https://registry.npmmirror.com \
    && pnpm install --filter ai --frozen-lockfile
COPY apps/ai apps/ai
RUN pnpm --filter ai build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    HOSTNAME=0.0.0.0
# standalone 产物按 monorepo 结构输出：server.js 位于 apps/ai/ 下
COPY --from=build /repo/apps/ai/.next/standalone ./
# standalone 里只追踪到 pdfjs-dist 的 legacy/build/pdf.mjs；它的 fake worker 是按包内
# 相对路径在运行时动态 import 的，nft 静态分析追不到（Turbopack 构建下
# outputFileTracingIncludes 也不生效），缺了会报 "Setting up fake worker failed"。
# 补上同版本 worker，版本号需与 apps/ai/package.json 里的 pdfjs-dist 保持一致。
COPY --from=build /repo/node_modules/.pnpm/pdfjs-dist@5.4.296/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs ./node_modules/.pnpm/pdfjs-dist@5.4.296/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs
COPY --from=build /repo/apps/ai/.next/static ./apps/ai/.next/static
# 拷贝 Drizzle 迁移文件与配置，供启动时执行 migrate
COPY --from=build /repo/apps/ai/drizzle ./apps/ai/drizzle
COPY --from=build /repo/apps/ai/drizzle.config.ts ./apps/ai/drizzle.config.ts
# drizzle-kit migrate 内部会 import drizzle-orm 的 migrator（再间接依赖 pg 驱动），
# 全局解析路径看不到 standalone 精简 node_modules，需一并全局安装
RUN npm install -g drizzle-kit@0.31.10 drizzle-orm@0.45.2 pg --registry=https://registry.npmmirror.com
# pdfjs-dist（pdf-parse 内部依赖）在 Node 下用 createRequire 动态加载 @napi-rs/canvas
# 来补 DOMMatrix / ImageData / Path2D 全局对象（其 legacy/pdf.mjs 模块顶层直接
# `new DOMMatrix()`），而这个可选原生依赖被 Next 的 nft 追踪漏掉，standalone 里缺失时
# 一导入 pdfjs-dist 就抛 "DOMMatrix is not defined"。nft 追不进来（软链 + nodir 限制），
# 这里在运行镜像里补装到 /app/node_modules，Node 向上查找即可命中。
# 单独 prefix 安装，避免 npm 以“空 package.json”把 standalone 自带的 node_modules 修剪掉。
RUN mkdir -p /opt/pdfjs-canvas \
    && npm install --prefix /opt/pdfjs-canvas --no-save @napi-rs/canvas@0.1.80 --registry=https://registry.npmmirror.com \
    && cp -a /opt/pdfjs-canvas/node_modules/@napi-rs /app/node_modules/@napi-rs \
    && node -e "const c=require('@napi-rs/canvas');if(typeof c.DOMMatrix!=='function')throw new Error('DOMMatrix missing');console.log('[image] @napi-rs/canvas ok / DOMMatrix ready')" \
    && rm -rf /opt/pdfjs-canvas
# 启动脚本：先执行 Drizzle 迁移，再启动 Next.js 服务
RUN printf '#!/bin/sh\nset -e\ncd /app/apps/ai\necho "[ai-service] running drizzle migrations..."\nDATABASE_URL="$DATABASE_URL" drizzle-kit migrate\ncd /app\necho "[ai-service] starting next.js server..."\nexec node apps/ai/server.js\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh
EXPOSE 3001
CMD ["/app/entrypoint.sh"]
