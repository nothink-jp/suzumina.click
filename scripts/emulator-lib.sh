# Firestore Emulator のセッション管理ヘルパー（dev-local.sh / e2e-emulator.sh から source する）。
# 使い方: HOST_PORT を設定 → `trap emulator_cleanup EXIT INT TERM` → `emulator_ensure "${ROOT}"`。
# 自前で起動した場合のみ emulator_cleanup が停止する（既存の Emulator には触れない）。

STARTED_EMULATOR=0
EMULATOR_PID=""

emulator_up() {
  curl -s -o /dev/null "http://${HOST_PORT}/" 2>/dev/null
}

emulator_cleanup() {
  if [[ "${STARTED_EMULATOR}" == "1" ]]; then
    echo "[emulator] Emulator を停止します"
    [[ -n "${EMULATOR_PID}" ]] && kill "${EMULATOR_PID}" 2>/dev/null || true
    # gcloud 配下の Java 子プロセスが取り残されることがあるためフォールバックで掃除
    pkill -f "cloud-firestore-emulator" 2>/dev/null || true
  fi
}

emulator_ensure() {
  local root="$1"
  if emulator_up; then
    echo "[emulator] 既存の Emulator (${HOST_PORT}) を利用します"
    return 0
  fi
  echo "[emulator] Emulator を起動します..."
  bash "${root}/scripts/firestore-emulator.sh" &
  EMULATOR_PID=$!
  STARTED_EMULATOR=1
  for _ in $(seq 1 60); do
    if emulator_up; then
      return 0
    fi
    sleep 1
  done
  echo "[emulator] Emulator の起動を確認できませんでした (${HOST_PORT})" >&2
  return 1
}
