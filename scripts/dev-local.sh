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

STARTED_EMULATOR=0
EMULATOR_PID=""

cleanup() {
  if [[ "${STARTED_EMULATOR}" == "1" && -n "${EMULATOR_PID}" ]]; then
    echo "[dev:local] Emulator (pid ${EMULATOR_PID}) を停止します"
    kill "${EMULATOR_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

emulator_up() {
  curl -s -o /dev/null "http://${HOST_PORT}/" 2>/dev/null
}

if emulator_up; then
  echo "[dev:local] 既存の Emulator (${HOST_PORT}) を利用します"
else
  echo "[dev:local] Emulator を起動します..."
  bash "${ROOT}/scripts/firestore-emulator.sh" &
  EMULATOR_PID=$!
  STARTED_EMULATOR=1
  for _ in $(seq 1 60); do
    if emulator_up; then break; fi
    sleep 1
  done
  if ! emulator_up; then
    echo "[dev:local] Emulator の起動を確認できませんでした (${HOST_PORT})" >&2
    exit 1
  fi
fi

echo "[dev:local] フィクスチャを投入します"
pnpm --filter @suzumina.click/functions seed:load

echo "[dev:local] web を Emulator 接続で起動します (http://localhost:3000)"
pnpm --filter @suzumina.click/web dev:local
