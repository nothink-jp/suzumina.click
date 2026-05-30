# ADR-008: monorepo を git worktree フレンドリーにする（SPR-62）

## ステータス

**承認済み** (2026-05-30) — SPR-62 スパイクの結論。P1〜P3 をブランチ `claude/awesome-mclaren-d2ceba` で実装。

## コンテキスト

suzumina.click は pnpm workspaces の monorepo だが、Claude Code（CLI・macOS アプリ・subagent）を用いた **git worktree 開発に向いていない**。調査で以下の痛点を確認した。

### 確認した痛点

- **新規 worktree が空で始まる**: 本 worktree も `node_modules` がゼロ。各 worktree で `mise trust` + `pnpm install` が必須（未実施だと typecheck/test が誤って失敗）。main の `node_modules` は約 1.0GB。
- **gitignore 対象の実行ファイルが付いてこない**: `apps/web/.env`・`apps/web/.env.local` は gitignore されており、新規 worktree には存在しない → web の dev/build が動かない。
- **`.claude/worktrees/` が `.gitignore` 未登録**: Claude Code は worktree を `.claude/worktrees/` に作るが未登録のため、main から untracked 扱いになり、root スキャナ（`pnpm secretlint "**/*"` / biome）の走査対象にもなる（低速・誤検出。※ vitest は固定 `projects` のため影響なし）。
- **旧スクリプトが worktree と相反**: `scripts/git-claude-start` / `git-claude-done` は `git checkout -b session/...` → `git merge` のブランチ切替式で、単一作業ディレクトリ前提。worktree 運用と矛盾する。
- **dev サーバのポート固定**: `next dev` が 3000 固定で、複数 worktree 同時起動時に衝突する。

### Claude Code のネイティブ worktree 機能（公式ドキュメントで確認）

痛点の大半は **Claude Code 標準機能で解決可能**だと判明した。

- worktree は既定で `.claude/worktrees/<name>/`（ブランチ `worktree-<name>`）に作成。公式も「`.claude/worktrees/` を `.gitignore` に追加せよ」と明記。
- **`.worktreeinclude`**（リポジトリ root の逆 `.gitignore`）: gitignore 対象（`.env` 等）を新規 worktree へ**自動コピー**。`--worktree`・subagent worktree・**macOS アプリの並列セッション**すべてに適用。
- `worktree.baseRef` / `symlinkDirectories` / `sparsePaths` / `bgIsolation` 設定が `settings.json` に存在。
- **配置場所を変える設定は無い**。`.worktrees/` 等へ移すには `WorktreeCreate` フックが必須で、**それを使うと `.worktreeinclude` が無効化**される副作用がある。

## 決定

**Claude Code のネイティブ worktree 機能に乗り、配置は既定の `.claude/worktrees/` に集約する**（現状もこの一系統。`.worktrees/` 等へは移さない）。

1. **配置の方針**: worktree は `.claude/worktrees/` のみ。配置変更は `WorktreeCreate` フックが必要で `.worktreeinclude` を失うため不採用。
2. **汚染防止**: `.gitignore` に `.claude/worktrees/` を追加。`.secretlintignore` と root `biome.json` の `includes` にも同ディレクトリの除外を追加。
3. **`.worktreeinclude` 新設**: root に `apps/web/.env`・`apps/web/.env.local` を列挙し、env を自動コピーさせる。
4. **依存初期化の自動化**: `.worktreeinclude` で賄えない `mise trust` + `pnpm install` を、`.claude/settings.json` の `SessionStart` フック（`matcher: startup`、`timeout: 600`）から冪等スクリプト `.claude/hooks/worktree-bootstrap.sh` で実行（`node_modules` 有無でガード）。同スクリプトは手動 `git worktree add` 向けに `.worktreeinclude` を読んで env をコピーするフォールバックも持つ。
5. **旧スクリプト削除**: `scripts/git-claude-start` / `git-claude-done` を削除（参照なしを確認済み）。
6. **ポート衝突**: `next dev` は `PORT` を尊重するため、`PORT=3001 pnpm --filter @suzumina.click/web dev` を docs で案内（コード変更なし）。
7. **docs**: `docs/guides/development.md` に worktree 運用節を追記。

## 理由

- ネイティブ機能（`.worktreeinclude` / `worktree.*`）で env コピー・gitignore・分岐元を賄えるため、自前スクリプトは「`mise trust` + `pnpm install`」の最小限で済む。
- 配置を既定の `.claude/worktrees/` に固定すると、CLI・macOS アプリ・subagent で挙動が一貫し、`.worktreeinclude` と `worktree.*` 設定がそのまま効く。`.worktrees/` へ寄せる利点は無く、`WorktreeCreate` フック保守 + `.worktreeinclude` 喪失のコストが生じる。
- `SessionStart` は再開ごとに発火するが `node_modules` ガードで冪等（main は即時 skip）。`WorktreeCreate`（作成時1回・確実）は `.worktreeinclude` を無効化するため、env 自動コピーと両立する `SessionStart` 方式を採る。

## 影響

- 新規 worktree が「`pnpm install` 以外は自動」で立ち上がる（フックが install まで自動化）。
- root スキャナ（secretlint/biome）の誤検出・低速化が解消。
- 旧 `git-claude-*` スクリプトの削除（小規模）。
- `.claude/settings.json` を committed 化するため、フックが全セッションで発火する（ガードで main は即時終了）。

## 代替案

1. **`.worktrees/` に統一**（`WorktreeCreate` フックで実現）→ `.worktreeinclude` 喪失・フック保守コスト増 → 不採用。
2. **`worktree.symlinkDirectories: ["node_modules"]` で node_modules 共有** → pnpm はワークスペース各所に `node_modules`/`.pnpm` を持つため root だけの symlink では不整合の恐れ。既知バグ（anthropics/claude-code #40259, #40857）もあり pnpm では非推奨。pnpm のグローバルストア + hardlink で install は十分軽いため通常 install を採用し、symlink は将来の最適化候補に留める。
3. **自前 bootstrap を手動実行のみ** → 自動化されず実行忘れで痛点が残る → 補助に留める。
4. **現状維持** → 痛点継続。

## 実装

| 変更 | パス |
| --- | --- |
| worktree 自動コピー設定 | `.worktreeinclude` |
| bootstrap スクリプト | `.claude/hooks/worktree-bootstrap.sh` |
| SessionStart フック | `.claude/settings.json` |
| gitignore / スキャン除外 | `.gitignore` / `.secretlintignore` / `biome.json` |
| 旧スクリプト削除 | `scripts/git-claude-start`・`scripts/git-claude-done` |
| 開発ガイド | `docs/guides/development.md` |

## 関連リンク

- SPR-62（本スパイク）、SPR-64（Entity/PlainObject 縮退・Firestore 整合性 cron 見直し）
- ADR-007: FCP/LCP パフォーマンス改善（SPR-9 シリーズ）
- Claude Code Docs: [worktrees](https://code.claude.com/docs/en/worktrees) / [settings](https://code.claude.com/docs/en/settings) / [hooks](https://code.claude.com/docs/en/hooks)

---
最終更新: 2026-05-30
作成日: 2026-05-30
作成者: Claude (Opus 4.8)
関連 SPR: SPR-62, SPR-64
