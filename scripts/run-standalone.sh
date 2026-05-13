#!/usr/bin/env bash
# 从仓库根目录启动 Next standalone（与 pm2 / systemd 配合）。
# 先执行：npm run build && npm run release:prepare
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/.next/standalone"
if [[ -f "$ROOT/.env.production" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env.production"
  set +a
fi
# 勿沿用登录 shell 的 HOSTNAME（macOS 常为计算机名）；Next 会对其做 getaddrinfo 导致启动失败
export HOSTNAME="${NEXT_BIND_HOST:-0.0.0.0}"
export PORT="${PORT:-3100}"
exec node server.js
