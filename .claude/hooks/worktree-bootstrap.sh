#!/usr/bin/env bash
# git worktree を Claude Code セッション向けに初期化する（SPR-62 / ADR-008）。
#
# 冪等かつ best-effort: 済んだ作業はスキップし、常に exit 0 でセッション開始を妨げない。
# `.claude/settings.json` の SessionStart フックから呼ばれる。新規 worktree では:
#   1. .worktreeinclude に列挙された gitignore 対象ファイルを main チェックアウトからコピー
#      （手動 `git worktree add` 用フォールバック。Claude 作成の worktree は .worktreeinclude
#       がネイティブに処理するため通常はここでは何もしない）
#   2. node_modules が無ければ mise trust + pnpm install を実行
set -u

cd "${CLAUDE_PROJECT_DIR:-$PWD}" 2>/dev/null || exit 0

log() { printf '[worktree-bootstrap] %s\n' "$1"; }

# --- 1. 手動 worktree 向け: gitignore 対象の実行時ファイルをコピー -----------------
common_dir=$(git rev-parse --git-common-dir 2>/dev/null || true)
git_dir=$(git rev-parse --git-dir 2>/dev/null || true)
if [ -n "$common_dir" ] && [ "$common_dir" != "$git_dir" ] && [ -f .worktreeinclude ]; then
	main_root=$(cd "$(dirname "$common_dir")" 2>/dev/null && pwd || true)
	if [ -n "$main_root" ] && [ "$main_root" != "$PWD" ]; then
		while IFS= read -r entry || [ -n "$entry" ]; do
			case "$entry" in '' | \#*) continue ;; esac
			if [ -f "$main_root/$entry" ] && [ ! -e "$entry" ]; then
				mkdir -p "$(dirname "$entry")"
				cp "$main_root/$entry" "$entry" && log "copied $entry from main checkout"
			fi
		done <.worktreeinclude
	fi
fi

# --- 2. 新規 worktree: ツールチェイン + 依存をインストール -------------------------
if [ -d node_modules ]; then
	exit 0
fi

log "node_modules not found - initializing this worktree (one-time setup)"

if command -v mise >/dev/null 2>&1; then
	mise trust >/dev/null 2>&1 || true
	mise install >/dev/null 2>&1 || true
fi

if command -v pnpm >/dev/null 2>&1; then
	log "running 'pnpm install' (may take a few minutes)..."
	pnpm install || log "pnpm install failed - run it manually"
	log "setup complete"
else
	log "pnpm not on PATH - run 'mise install && pnpm install' manually"
fi

exit 0
