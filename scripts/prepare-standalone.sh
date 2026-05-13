#!/usr/bin/env bash
# 在 `npm run build` 之后执行：把静态资源拷入 standalone 目录（Next 官方要求）。
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STANDALONE="$ROOT/.next/standalone"
if [[ ! -f "$STANDALONE/server.js" ]]; then
  echo "缺少 $STANDALONE/server.js，请先执行 npm run build" >&2
  exit 1
fi
mkdir -p "$STANDALONE/.next"
rm -rf "$STANDALONE/.next/static" "$STANDALONE/public"
cp -R "$ROOT/.next/static" "$STANDALONE/.next/static"
if [[ -d "$ROOT/public" ]]; then
  cp -R "$ROOT/public" "$STANDALONE/public"
else
  mkdir -p "$STANDALONE/public"
fi
echo "standalone 静态资源已就绪：$STANDALONE"
