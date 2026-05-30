# Git ワークフロー・ブランチ戦略

suzumina.click の Git 運用ガイド（Claude Code worktree 連携 / [ADR-008](../decisions/architecture/ADR-008-git-worktree-friendly-monorepo.md)）。

## 🎯 Worktree 戦略

Claude Code は各セッションを独立した git worktree（既定で `.claude/worktrees/<name>/`）で動かせる。worktree ごとにブランチと作業ディレクトリが分かれるため、複数タスクを衝突なく並行できる。

```text
main ←── worktree-A（機能開発）
     ←── worktree-B（バグ修正）   ← それぞれ独立した作業ディレクトリ + ブランチ
```

### 基本ワークフロー

```bash
# 1. worktree を作成して起動（Claude Code ネイティブ）
claude --worktree feature-x
#   → .claude/worktrees/feature-x/ に作成、ブランチ worktree-feature-x
#   → SessionStart フックが mise trust + pnpm install を自動実行
#   → .worktreeinclude に従い .env / .env.local を main から自動コピー

# 2. 開発作業（Claude Code に指示）

# 3. 品質確認（コミット前に必須）
pnpm check          # Biome lint + format（自動修正）
pnpm typecheck      # 型チェック
pnpm test           # ユニットテスト
pnpm build          # ビルド確認

# 4. PR 作成 → main へマージ
gh pr create
```

> main は ruleset で保護（squash マージのみ）。直接 push せず PR 経由でマージする。

### 手動で worktree を作る場合

```bash
git worktree add .claude/worktrees/feature-x -b feature-x
cd .claude/worktrees/feature-x && claude
#   → 初回セッションで bootstrap フックが依存インストールと .env コピーを補完
git worktree remove .claude/worktrees/feature-x   # 後片付け
```

自動初期化は `.claude/hooks/worktree-bootstrap.sh`（`.claude/settings.json` の SessionStart フックから起動）が担当し、`node_modules` の有無で冪等にガードされる。

### 複数 worktree を同時起動するとき

```bash
PORT=3001 pnpm --filter @suzumina.click/web dev   # next dev は PORT を尊重
```

## 📂 ブランチ命名規則

- **worktree-[name]**: Claude Code worktree（`--worktree` で自動命名）
- **feature/[task]**: 新機能
- **fix/[task]**: バグ修正
- **docs/[task]**: ドキュメント
- **chore/[task]**: リファクタリング・設定変更

コミットは Conventional Commits（`feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:`）に従う。

## ⚡ CI/CD 最適化

- **パス指定トリガー**: アプリ別に変更を検知し、必要なものだけデプロイ
- **共通テストワークフロー**: 重複実行を削減
- **軽量セキュリティ**: secretlint 等を必要最小限で実行

## 🚨 緊急時対応

### Hotfix

```bash
git worktree add .claude/worktrees/hotfix -b fix/urgent
cd .claude/worktrees/hotfix
# 修正 → pnpm check → PR → squash マージ
```

### ロールバック

```bash
git revert <commit-hash>   # 履歴を残す安全な取り消し
gh pr create               # revert も PR 経由でマージ
```

## 📚 関連ドキュメント

- [開発ガイド](./development.md) - 開発環境・品質基準
- [ADR-008: worktree フレンドリー化](../decisions/architecture/ADR-008-git-worktree-friendly-monorepo.md)
- [プロジェクト概要](../../README.md) - 全体構成・技術スタック
