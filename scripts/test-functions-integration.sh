#!/usr/bin/env bash
#
# Cloud Run Functions のインテグレーションテストを Firestore Emulator 実機で回す。
#   - dev:local(8080) とは別ポート(8765)で使い捨て Emulator を起動
#   - RUN_INTEGRATION_TESTS=true を立てて該当テストのみ実行
#   - 各テストは Emulator のデータを全消去するため、本ポートに本物データを置かないこと
#
# firebase コマンドは使わない（CLAUDE.md 方針）。gcloud 版 Emulator を利用。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_PORT="${FIRESTORE_EMULATOR_HOST:-127.0.0.1:8765}"
export FIRESTORE_EMULATOR_HOST="${HOST_PORT}"
export GOOGLE_CLOUD_PROJECT="${GOOGLE_CLOUD_PROJECT:-suzumina-click}"

STARTED_EMULATOR=0
EMULATOR_PID=""

cleanup() {
  if [[ "${STARTED_EMULATOR}" == "1" ]]; then
    echo "[itest] Emulator を停止します"
    [[ -n "${EMULATOR_PID}" ]] && kill "${EMULATOR_PID}" 2>/dev/null || true
    pkill -f "cloud-firestore-emulator" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

emulator_up() {
  curl -s -o /dev/null "http://${HOST_PORT}/" 2>/dev/null
}

if emulator_up; then
  echo "[itest] 既存の Emulator (${HOST_PORT}) を利用します"
else
  echo "[itest] Emulator を ${HOST_PORT} で起動します..."
  bash "${ROOT}/scripts/firestore-emulator.sh" &
  EMULATOR_PID=$!
  STARTED_EMULATOR=1
  for _ in $(seq 1 60); do
    if emulator_up; then break; fi
    sleep 1
  done
  if ! emulator_up; then
    echo "[itest] Emulator の起動を確認できませんでした (${HOST_PORT})" >&2
    exit 1
  fi
fi

echo "[itest] インテグレーションテストを実行します"
RUN_INTEGRATION_TESTS=true pnpm --filter @suzumina.click/functions test:integration
