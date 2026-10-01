# Architecture Decision Records (ADRs)

このディレクトリには、プロジェクトの重要な技術的決定事項を記録したArchitecture Decision Records (ADRs)が含まれています。

## ADRとは

ADR（Architecture Decision Record）は、重要な技術的決定とその理由を文書化したものです。
将来の開発者（自分自身を含む）が、なぜ特定の決定がなされたかを理解できるようにします。

## ADR一覧

状態は各 ADR の「ステータス」節が正本（ここは要約）。Entity 化の判定条件の正本は CLAUDE.md §0。

### アーキテクチャ設計

| ADR | 状態 | 要旨 |
|---|---|---|
| [ADR-001: DDD実装ガイドライン](architecture/ADR-001-ddd-implementation-guidelines.md) | 承認済み（判定条件は CLAUDE.md へ昇格） | 過剰な DDD 適用でコード量が 25 倍になった失敗の記録 |
| [ADR-002: TypeScript型安全性強化](architecture/ADR-002-typescript-type-safety-enhancement.md) | 置き換え済み（→ ADR-006） | BaseEntity / BaseValueObject による統一（クラスごと撤去） |
| [ADR-003: Firestoreクエリ最適化](architecture/ADR-003-firestore-query-optimization.md) | 置き換え済み | 実装されず。後継は SPR-213/218 の「全件取得 + cache」方針 |
| [ADR-004: AudioButton Entity削除計画](architecture/ADR-004-audiobutton-entity-removal-plan.md) | 実施完了 | ADR-006 の一部として完了 |
| [ADR-005: Entity実装の教訓](architecture/ADR-005-entity-implementation-lessons.md) | 承認済み（8/19 追記は置き換え済み） | Circle/Creator の Entity 化を見送った教訓 |
| [ADR-006: 関数型アーキテクチャ移行](architecture/ADR-006-functional-architecture-migration.md) | 実施完了 | Entity クラスを撤去し PlainObject + 純粋関数へ（SPR-181） |
| [ADR-007: FCP/LCP パフォーマンス改善](architecture/ADR-007-fcp-lcp-performance-improvements.md) | 承認済み（cpu_idle は SPR-83 で反転） | SPR-9 シリーズの perf 施策と framework hydration の床 |
| [ADR-008: monorepo を git worktree フレンドリーにする](architecture/ADR-008-git-worktree-friendly-monorepo.md) | 承認済み | SPR-62。`.worktreeinclude` + SessionStart フック |
| [ADR-013: Cloud Run Functions endpoint のアーキテクチャ](architecture/ADR-013-cloud-functions-endpoint-architecture.md) | 承認済み | SPR-231。薄いハンドラ → run-* → services の 3 層、横断処理は `shared/run-metadata.ts` のみ |

### インフラストラクチャ

| ADR | 状態 | 要旨 |
|---|---|---|
| [ADR-009: GitHub Actions Deploy と Terraform IaC の役割分担](infrastructure/ADR-009-deploy-iac-responsibility-split.md) | 承認済み（GC に 1 件例外: SPR-247） | SPR-91。「1 リソース 1 属性 1 正本」 |
| [ADR-010: Terraform plan自動 / apply承認制 CI](infrastructure/ADR-010-terraform-ci-plan-apply.md) | 承認済み（#991 で 1 workflow に統合） | SPR-99。plan / apply の SA 分離・secret を TF 管理外化 |

### フロントエンド

| ADR | 状態 | 要旨 |
|---|---|---|
| [ADR-011: shadcn/ui の保守方針](frontend/ADR-011-shadcn-ui-maintenance-policy.md) | 承認済み | SPR-61。生成物は手編集せず再生成・未使用は削除・light-only |
| [ADR-012: ReUI の導入方針](frontend/ADR-012-reui-adoption-policy.md) | 承認済み（結果として ReUI 由来は 0 件） | 候補 4 点は shadcn 公式 / Base UI 直接 / 手書きで着地 |

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