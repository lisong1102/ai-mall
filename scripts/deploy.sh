#!/usr/bin/env bash
# 一键部署：rsync 增量同步代码到服务器并重建容器
# 用法：
#   pnpm deploy              # 同步并重建所有服务
#   pnpm deploy ai-service   # 只重建指定服务（改动只涉及某个服务时更快）
set -euo pipefail

SERVER="root@39.107.89.142"
REMOTE_DIR="/opt/ai-mall"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE="${1:-}"

echo "==> 同步代码 ${PROJECT_ROOT} -> ${SERVER}:${REMOTE_DIR}"
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='target' \
  --exclude='.turbo' \
  --exclude='.DS_Store' \
  --exclude='.env*' \
  --exclude='*.tar.gz' \
  "${PROJECT_ROOT}/" "${SERVER}:${REMOTE_DIR}/"

echo "==> 服务器重建并启动容器: ${SERVICE:-全部服务}"
ssh "${SERVER}" "cd ${REMOTE_DIR} && docker compose up -d --build ${SERVICE}"

echo "==> 部署完成，当前容器状态："
ssh "${SERVER}" "cd ${REMOTE_DIR} && docker compose ps"
