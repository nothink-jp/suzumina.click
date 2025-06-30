# Claude Code連携ブランチ戦略レビュー

## 📋 概要

本ドキュメントは、suzumina.clickプロジェクトにおけるClaude Codeとの協働開発を前提とした、効率的なブランチ戦略とCI/CDパイプライン最適化の提案をまとめたものです。

## 🎯 現状の課題

### CI/CDコスト問題

- **過剰なデプロイトリガー**: packages配下の変更で全アプリがデプロイ
- **冗長なテスト実行**: 各デプロイワークフローで同じテストを重複実行
- **過度なセキュリティスキャン**: 個人開発には不要な毎日実行
- **長期アーティファクト保持**: 30-90日間の保持によるストレージコスト

### 開発フロー

- 現在: mainブランチ直接開発
- 課題: 履歴管理・ロールバック・プレビュー環境の欠如

## 🚀 提案する戦略

### 1. Session Branch戦略

#### 基本ルール

```bash
# セッション開始時
git checkout -b session/$(date +%Y%m%d-%H%M)

# セッション終了時
git checkout main && git merge --no-ff session/20250630-1430
git push origin main
git branch -d session/20250630-1430
```

#### 利点

- 認知負荷最小（ブランチ名を考えない）
- Claude Codeセッション単位で履歴管理
- ロールバック容易
- プレビュー環境との連携

### 2. プレビュー環境自動構築

#### アーキテクチャ

```text
session/* ブランチ → GitHub Actions → Cloud Run Preview → 自動URL生成
                                                      → 24時間後自動削除
```

#### 実装内容

- **Terraform**: プレビュー用サービスアカウント・権限設定
- **GitHub Actions**: 自動ビルド・デプロイ・URL通知
- **自動クリーンアップ**: 24時間経過・ブランチ削除時に環境削除

#### コスト最適化

```yaml
min-instances: 0  # 使用時のみ起動
max-instances: 1  # 単一インスタンス  
memory: 512Mi     # 最小メモリ
cpu: 1            # 最小CPU
```

### 3. Claude Code自動ブランチ作成

#### CLAUDE.md指示

```markdown
## タスク開始手順
1. git checkout main && git pull
2. git checkout -b [type]/[task]-$(date +%Y%m%d-%H%M)
   - feature/: 新機能
   - fix/: バグ修正
   - docs/: ドキュメント
   - chore/: その他
```

#### 安全対策

- Git hooks: mainブランチコミット時の警告・自動ブランチ作成
- VS Code統合: タスク・ターミナルプロファイル設定
- GitHub Actions: mainへの直接push検知

### 4. CI/CD最適化

#### 改善案

1. **パッケージ別トリガー**
   ```yaml
   paths:
     - 'apps/web/**'
     - 'packages/shared-types/**'  # 直接影響のみ
   ```

2. **統合CI/CDワークフロー**
   - PR時: 軽量チェック（変更ファイルのみ）
   - main時: 完全チェック＋デプロイ

3. **スケジュール調整**
   - セキュリティスキャン: 週1回
   - アーティファクト保持: 7日間

## 📊 期待される効果

### 開発効率

- **開発速度**: 現状とほぼ同等（3-7分/サイクル）
- **品質向上**: ブランチ保護・自動テスト
- **プレビュー確認**: 即座に実装確認可能

### コスト削減

- **GitHub Actions実行時間**: 40-60%削減
- **Container Registry使用量**: 30%削減
- **アーティファクトストレージ**: 70%削減
- **不要なCloud Runデプロイ**: 80%削減

## 🔄 段階的導入計画

### Phase 1: 基本設定（1週間）

1. CLAUDE.md更新 - ブランチ作成ルール記載
2. Git aliases設定 - claude-start/claude-done
3. 軽量PR workflow作成

### Phase 2: プレビュー環境（2週間）

1. Terraform設定 - サービスアカウント作成
2. preview-deploy.yml作成
3. 自動クリーンアップ設定

### Phase 3: 完全移行（3週間〜）

1. CI/CDワークフロー最適化
2. mainブランチ保護ルール
3. 運用ドキュメント整備

## 🎯 推奨アクション

### 即時実施可能

1. Git aliasesの設定
2. CLAUDE.mdへのブランチルール追加
3. セキュリティスキャン頻度変更（daily → weekly）

### 短期実施（1-2週間）

1. Session Branch戦略の試験運用
2. プレビュー環境のTerraform/Actions設定
3. CI/CDトリガー条件の見直し

### 中期実施（1ヶ月）

1. 完全なブランチ戦略移行
2. CI/CDパイプライン統合
3. コスト効果測定・調整

## 💡 考慮事項

### メリット

- 最小限の認知負荷でプロセス改善
- Claude Codeとの相性が良い
- 段階的導入が可能
- 即座にコスト削減効果

### 注意点

- 初期設定の手間
- チーム開発時は調整必要
- プレビュー環境のセキュリティ考慮

## 🔒 GitHubブランチプロテクションルール

### 個人開発向け軽量設定

#### mainブランチ保護（最小構成）

```yaml
# GitHub Settings > Branches > Add rule
Branch name pattern: main

✅ Require a pull request before merging
  ☐ Require approvals (個人開発では不要)
  ✅ Dismiss stale pull request approvals when new commits are pushed
  ☐ Require review from CODEOWNERS (不要)

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  選択するステータスチェック:
    - typecheck (必須)
    - lint (必須)
    - test (推奨)

☐ Require conversation resolution before merging (個人開発では不要)

✅ Include administrators (自分も含めて保護)

✅ Allow force pushes
  ✅ Specify who can force push: 自分のみ
  理由: 緊急時のロールバック用

☐ Allow deletions (mainブランチ削除は禁止)
```

#### 自動マージ設定

```yaml
# PR設定で有効化
✅ Allow auto-merge
✅ Automatically delete head branches (マージ後のブランチ自動削除)
```

### Claude Code連携最適化

#### 推奨設定の理由

1. **最小限の保護**
   - レビュー承認は不要（個人開発）
   - 基本的な品質チェックのみ必須
   - 自分自身も保護対象（誤操作防止）

2. **緊急対応の余地**
   - Force pushは自分のみ許可
   - 緊急hotfixのための柔軟性確保

3. **自動化との相性**
   - Auto-mergeでClaude Code作業を効率化
   - ブランチ自動削除で管理負荷削減

### 段階的導入プラン

#### Phase 1: 保護なし運用（現在）
```
- ブランチ保護ルールなし
- 直接mainへpush
```

#### Phase 2: 軽量保護（推奨開始地点）
```yaml
✅ Require status checks (typecheck, lint)
✅ Include administrators
✅ Allow force pushes (自分のみ)
```

#### Phase 3: 標準保護（安定後）
```yaml
✅ Require pull request
✅ Require status checks
✅ Auto-merge enabled
```

### セキュリティ考慮事項

#### プライベートリポジトリの場合

```yaml
# 最小限の設定で十分
- Status checks: typecheck, lint
- Force push: 自分のみ
- PR必須: 任意
```

#### パブリックリポジトリ移行時

```yaml
# より厳格な設定に変更
✅ Require pull request reviews (1人以上)
✅ Dismiss stale reviews
✅ Restrict who can push (特定ユーザーのみ)
☐ Allow force pushes (無効化)
```

### GitHub CLI活用

```bash
# ブランチ保護ルール設定（CLI）
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["typecheck","lint"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews=null \
  --field restrictions=null
```

### トラブルシューティング

#### よくある問題と解決策

1. **「Status checks failing」エラー**
   ```bash
   # ローカルで事前チェック
   pnpm typecheck && pnpm lint
   ```

2. **マージできない場合**
   ```bash
   # ブランチを最新に
   git checkout feature/branch
   git rebase main
   git push --force-with-lease
   ```

3. **緊急時のバイパス**
   ```bash
   # 管理者権限でforce push
   git push --force origin main
   ```

## 📝 次のステップ

1. **意思決定**: どの戦略を採用するか
2. **優先順位**: 実装順序の決定
3. **実装開始**: 選択した項目から着手
4. **ブランチ保護**: 段階的に導入

---

*このドキュメントは2025年6月30日時点の提案です。プロジェクトの成長に応じて戦略の見直しを推奨します。*
