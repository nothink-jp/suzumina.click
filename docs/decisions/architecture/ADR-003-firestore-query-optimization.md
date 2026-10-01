# ADR-003: Firestore クエリ最適化とコンポーネント共通化

## ステータス

**置き換え済み（Superseded）**（2026-07-04・SPR-244 で確定。以下の本文は当時の提案の記録としてそのまま残す）

本 ADR は「提案中」のまま実装されず、前提も実体と乖離していた:
提案が依拠する `works.publishedAt` / `works.isR18` というフィールドは本番 works に存在しない
（実フィールドは `releaseDateISO` / `ageRating`。`audioButtons` も `publishedAt` でなく `createdAt`）。
つまり提案どおりには実装不可能な文書だった。意図した目標は別系譜で達成されている:

| Phase | 帰結 | 実際の後継 |
|---|---|---|
| Phase 1: トップページのクエリ最適化 | 別方針で達成 | home 3 セクションの `unstable_cache`(60s) + limit(10)（SPR-71） |
| Phase 2: 共通リストコンポーネント | 別名で実現 | `packages/ui` の `ConfigurableList` / `list-page-layout`（ItemList という形では作らず） |
| Phase 3: 全ページのクエリ最適化 | 逆方針で置換 | 「全件取得 + in-memory フィルタ + cache（60s〜24h）」を正式採用（SPR-213 / SPR-218） |

インデックス追加でなく「全件 + cache」が正になったため、本 ADR のインデックス表も無効
（複合インデックスの正本は terraform + live。棚卸しは SPR-213）。

## 当時の提案（要約）

P95 高レイテンシアラートと全件スキャンによる読み取り増を受け、(1) トップページ等のクエリを「where + orderBy + limit + 複合インデックス」へ置き換え、
(2) 汎用リストコンポーネント（ItemList）と共通取得 Server Action で一覧実装を統一し、(3) 全一覧・検索・詳細ページへ段階展開する、という 3 段階の提案だった。
提案本文のクエリ例・インデックス表は存在しないフィールドを前提にしていたため削除した（帰結は上表）。

## 参考資料
- [ADR-001: DDD実装ガイドライン](./ADR-001-ddd-implementation-guidelines.md)
