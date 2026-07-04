#!/usr/bin/env bash
#
# e2e ワンショット実行（CI の e2e-smoke と同じ「本番ビルド × Firestore Emulator」構成をローカルで再現する）:
#   1) Firestore Emulator を起動（未起動なら）
#   2) フィクスチャを投入（seed:load）
#   3) web を本番ビルド（PLAYWRIGHT_SKIP_BUILD=1 で省略可。spec だけ直すとき用）
#   4) Playwright smoke を実行（データ依存 spec: e2e/data-smoke.spec.ts を含む）
#
# ADC は不要。本番 Firestore には一切触れない。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_PORT="127.0.0.1:8080"
export FIRESTORE_EMULATOR_HOST="${HOST_PORT}"
# 本番ビルド × Emulator を許可する安全弁の opt-in（apps/web/src/lib/firestore.ts）
export PLAYWRIGHT_EMULATOR=1
# 認証は e2e では使わないが、boot に必要な env を未設定時のみダミーで補う（CI と同じ扱い）
export BETTER_AUTH_URL="${BETTER_AUTH_URL:-http://127.0.0.1:3000}"
export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-e2e-local-dummy-not-a-real-secret}"

# shellcheck source=scripts/emulator-lib.sh
source "${ROOT}/scripts/emulator-lib.sh"
trap emulator_cleanup EXIT INT TERM

emulator_ensure "${ROOT}"

echo "[e2e] フィクスチャを投入します"
pnpm --filter @suzumina.click/functions seed:load

if [[ "${PLAYWRIGHT_SKIP_BUILD:-}" == "1" ]]; then
  echo "[e2e] 本番ビルドを省略します (PLAYWRIGHT_SKIP_BUILD=1)"
else
  echo "[e2e] web を本番ビルドします"
  pnpm --filter @suzumina.click/web build
fi

echo "[e2e] Playwright smoke を実行します（本番ビルド × Emulator）"
pnpm --filter @suzumina.click/web test:e2e:smoke
