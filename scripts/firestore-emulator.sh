#!/usr/bin/env bash
#
# gcloud 版 Firestore Emulator (native mode) を起動する。
# firebase コマンドは使わない（CLAUDE.md の方針: Firebase 未使用）。
# @google-cloud/firestore SDK は FIRESTORE_EMULATOR_HOST を見て自動接続するため、
# このポートに合わせて web / functions 側の環境変数を設定すること。
set -euo pipefail

HOST_PORT="${FIRESTORE_EMULATOR_HOST:-127.0.0.1:8080}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "[emulator] gcloud が見つかりません。Google Cloud SDK を導入してください。" >&2
  exit 1
fi

# cloud-firestore-emulator コンポーネントが未導入なら導入する
if ! gcloud components list --format="value(state.name)" \
    --filter="id=cloud-firestore-emulator" 2>/dev/null | grep -qix "installed"; then
  echo "[emulator] cloud-firestore-emulator component を導入します..."
  if ! gcloud components install cloud-firestore-emulator --quiet; then
    echo "[emulator] component 導入に失敗しました。手動で次を実行してください:" >&2
    echo "           gcloud components install cloud-firestore-emulator" >&2
    exit 1
  fi
fi

echo "[emulator] Firestore Emulator (native mode) を ${HOST_PORT} で起動します"
exec gcloud emulators firestore start \
  --host-port="${HOST_PORT}" \
  --database-mode=firestore-native
