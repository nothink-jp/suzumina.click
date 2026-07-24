# Architecture Decision Records (ADRs)

このディレクトリには、プロジェクトの重要な技術的決定事項を記録したArchitecture Decision Records (ADRs)が含まれています。

## ADRとは

ADR（Architecture Decision Record）は、重要な技術的決定とその理由を文書化したものです。
将来の開発者（自分自身を含む）が、なぜ特定の決定がなされたかを理解できるようにします。

## ADR一覧

### アーキテクチャ設計

- [ADR-001: DDD実装ガイドライン](architecture/ADR-001-ddd-implementation-guidelines.md) - Entity実装の判断基準
- [ADR-002: TypeScript型安全性強化](architecture/ADR-002-typescript-type-safety-enhancement.md) - Branded Types、Result型、Zod統合
- [ADR-005: Entity実装の教訓](architecture/ADR-005-entity-implementation-lessons.md) - Entity/PlainObjectパターンの維持決定
- [ADR-003: Firestoreクエリ最適化](architecture/ADR-003-firestore-query-optimization.md) - **置き換え済み**（実装されず。後継は SPR-213/218 の「全件取得 + cache」方針）
- [ADR-006: 関数型アーキテクチャ移行](architecture/ADR-006-functional-architecture-migration.md) - 関数型パターンへの移行検討
- [ADR-004: AudioButton Entity削除計画](architecture/ADR-004-audiobutton-entity-removal-plan.md) - レガシーEntity整理
- [ADR-007: FCP/LCP パフォーマンス改善の意思決定記録](architecture/ADR-007-fcp-lcp-performance-improvements.md) - SPR-9シリーズの perf 施策と framework hydration の床
- [ADR-008: monorepo を git worktree フレンドリーにする](architecture/ADR-008-git-worktree-friendly-monorepo.md) - SPR-62、Claude Code ネイティブ worktree 機能の活用方針
- [ADR-013: Cloud Run Functions endpoint のアーキテクチャ](architecture/ADR-013-cloud-functions-endpoint-architecture.md) - SPR-231、薄いハンドラ→named orchestrator（run-*）→services の3層統一・横断処理は`shared/run-metadata.ts`の1つに限定・過剰一般化の見送り一覧

### インフラストラクチャ

- [ADR-009: GitHub Actions Deploy と Terraform IaC の役割分担](infrastructure/ADR-009-deploy-iac-responsibility-split.md) - SPR-91、二重管理の解消と「1リソース1属性1正本」原則（Cloud Run=terraform spec / Functions=Actions / GC=terraform、2-Phase 移行）
- [ADR-010: Terraform plan自動 / apply承認制 CI](infrastructure/ADR-010-terraform-ci-plan-apply.md) - SPR-99（ADR-009 Phase 2）、plan先行の2-Stage・plan/apply の SA 分離・secret を TF 管理外化

### フロントエンド

- [ADR-012: ReUI の導入方針（packages/ui 閉じ込め・Base UI 変種限定・ADR-011 保守方針の継承）](frontend/ADR-012-reui-adoption-policy.md) - ReUI 導入ストリーム、shadcn 互換レジストリのコピーイン導入。境界=packages/ui のみ（registries 設定も packages/ui 限定）・Base UI 変種のみ・採用は手組み置換の4点（Chart/Autocomplete/EmptyState/Filters）に限定・provenance 一覧を ADR 内で正本管理
- [ADR-011: shadcn/ui の保守方針（再生成優先・未使用削除・テーマトークン v4 互換化）](frontend/ADR-011-shadcn-ui-maintenance-policy.md) - SPR-61、生成物は手編集せず `add --overwrite`+Biome で再生成・未使用は削除（45→28）・class並べ替えchurnは追わない。ブランド色は semantic トークンで適用し、`@theme` を `hsl()` 包みにして v4 自動生成を有効化 → 手動ユーティリティ層・`!important` override 層・死にダークブロックを撤去（globals.css −約200行）。在file例外は button/tabs(設計)/calendar(依存非互換)。アプリは light-only と判明

## ADRの書き方

新しいADRを作成する場合は、以下のテンプレートを使用してください：

```markdown
# ADR-XXX: [タイトル]

## ステータス
[提案中 | 承認済み | 非推奨 | 置き換え済み]

## コンテキスト
[決定が必要になった背景と問題の説明]

## 決定
[実際に決定した内容]

## 理由
[なぜこの決定をしたのか]

## 結果
[この決定による影響（良い点・悪い点）]

## 参考
[関連する資料やリンク]
```

## 命名規則

- ファイル名: `ADR-XXX-短い説明.md` (XXXは3桁の連番)
- カテゴリ別にサブディレクトリに配置
  - `architecture/` - アーキテクチャ全般
  - `infrastructure/` - インフラ関連
  - `frontend/` - フロントエンド関連
  - `backend/` - バックエンド関連