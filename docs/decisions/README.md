# Architecture Decision Records (ADRs)

このディレクトリには、プロジェクトの重要な技術的決定事項を記録したArchitecture Decision Records (ADRs)が含まれています。

## ADRとは

ADR（Architecture Decision Record）は、重要な技術的決定とその理由を文書化したものです。
将来の開発者（自分自身を含む）が、なぜ特定の決定がなされたかを理解できるようにします。

## ADR一覧

### アーキテクチャ設計

- [ADR-001: DDD実装ガイドライン](architecture/ADR-001-ddd-implementation-guidelines.md) - Entity実装の判断基準
- [ADR-002: TypeScript型安全性強化とDDDパターンの統一](architecture/ADR-002-typescript-type-safety-enhancement.md) - Branded Types、Result型、Zod統合による型安全性向上

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