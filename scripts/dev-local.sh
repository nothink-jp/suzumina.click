#!/usr/bin/env bash
#
# ローカル開発のワンショット起動:
#   1) Firestore Emulator を起動（未起動なら）
#   2) フィクスチャを投入（seed:load）
#   3) web を Emulator 接続で dev 起動
#
# ADC は不要。本番 Firestore には一切触れない。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_PORT="127.0.0.1:8080"
export FIRESTORE_EMULATOR_HOST="${HOST_PORT}"

# shellcheck source=scripts/emulator-lib.sh
source "${ROOT}/scripts/emulator-lib.sh"
trap emulator_cleanup EXIT INT TERM

emulator_ensure "${ROOT}"

echo "[dev:local] フィクスチャを投入します"
pnpm --filter @suzumina.click/functions seed:load

echo "[dev:local] web を Emulator 接続で起動します (http://localhost:3000)"
pnpm --filter @suzumina.click/web dev:local
