# ADR-013: Cloud Run Functions endpoint のアーキテクチャ（SPR-231）

## ステータス

**承認済み**（2026-07-24）— SPR-231 の設計案（2026-07-05）を全4段階（PR #850〜855）で実装完了。

## コンテキスト

`apps/functions`（GCFv2・Pub/Sub トリガー）の3つの定期実行 endpoint が、SPR-229/230 の実装を経て肥大化していた。

| endpoint | 行数（起票時→実装直前） | 混在していた関心事 |
| -- | -- | -- |
| `dlsite-individual-info-api.ts` | 729→931 | CloudEvent ハンドラ + バッチループ/cursor/metadata/fast-lane/creator recompute drain + ~20 private ヘルパ |
| `youtube.ts` | 455→929 | ハンドラ + discovery/playlist マッピング/統計ティア/metadata/lock + ヘルパ |
| `data-integrity-check.ts` | 624 | ハンドラ + 4種の整合性検査・修復ロジック + ヘルパ |

「この関数の本処理はどこか」「cursor/lock はどう実装されているか」が、都度ファイルを縦断しないと分からない状態だった（CLAUDE.md 軸2＝予測可能性の毀損）。

さらに横断処理が endpoint ごとに**別実装で重複**していた。特に「metadata doc の get-or-create + サニタイズ update」は dlsite（`unified_data_collection_metadata`）と youtube（`fetch_metadata`）で骨格が完全一致していた。

## 決定

### 1. 統一構造: `endpoints/<domain>/` サブディレクトリ + 3層

新しいトップレベル層（`orchestration/` 等）は作らない。オーケストレータは「その endpoint の本処理」であり独立した再利用単位ではないため、`endpoints/<domain>/` 配下に **collocation**（CLAUDE.md の近接配置原則）する。`services/` への移設も却下（`services` = IO という予測可能性を壊すため）。

```
endpoints/
├── index.ts                    # Cloud Functions 登録のみ
├── dlsite/
│   ├── fetch-dlsite-unified-data.ts   # 薄いハンドラ
│   ├── run-unified-data-collection.ts # オーケストレータ（run-*）
│   ├── collection-metadata.ts         # metadata + 継続 cursor
│   └── process-batch.ts               # 1バッチの実行/集計/ログ
├── youtube/
│   ├── fetch-youtube-videos.ts        # 薄いハンドラ
│   ├── run-video-fetch.ts             # オーケストレータ（normal/weekly_full_sweep/fast_recheck）
│   ├── fetch-metadata.ts              # metadata + 排他ロック
│   ├── video-discovery.ts             # uploads playlist discovery
│   └── playlist-mapping.ts            # playlist→video マッピング（3層タグ）
└── data-integrity/
    ├── check-data-integrity.ts        # 薄いハンドラ
    ├── run-integrity-check.ts         # オーケストレータ（4検査の実行順序・集計・保存）
    └── integrity-checks.ts            # 4種の検査・修復関数
```

- **薄いハンドラ**: CloudEvent unwrap（Pub/Sub decode・mode 判定）→ オーケストレータ呼び出し → 結果ログ、のみ。
- **オーケストレータ（`run-*.ts`）**: その endpoint の本処理。命名規約 `run-*` は youtube.ts に既にあった `runNormalFetchAndSave`/`runWeeklyFullSweep` を一般化・追認したもの。
- **ハンドラのエクスポート名（Cloud Functions 登録名）は不変**。terraform/deploy 設定と結合しているため、`fetchDLsiteUnifiedData` / `fetchYouTubeVideos` / `checkDataIntegrity` は一切変えない。
- ファイル構成は各 endpoint の実際の凝集単位に合わせて決める（下記「4ファイル案からの逸脱」参照）。ファイル数を事前に固定しない。

### 2. 横断ユーティリティは `shared/run-metadata.ts` の1つだけ

metadata doc の get-or-create/update 骨格（get → exists ? data : create(initial)）が dlsite/youtube で完全同一だったため抽出した。

```ts
export function createRunMetadataStore<T extends object>(options: {
  collection: string;
  docId: string;
  createInitial: () => T;
  sanitizeUpdate: (updates: Partial<T>) => Record<string, unknown>;
}): RunMetadataStore<T>;
```

- **サニタイズ戦略は統一せず、関数注入で温存する**: dlsite は `undefined → FieldValue.delete()`（`withClearedUndefined`）、youtube は `undefined → null` + `lastFetchedAt` 常時注入。Firestore に残る値が変わる＝挙動そのものであり、統一は挙動変更になるため意図的に非対称を残した。
- **作成は `create()`（原子的・存在時は `ALREADY_EXISTS`）を使う**: 当初 `set()` だった get-or-create には TOCTOU（並行呼び出しの両者が「不在」を観測して二重作成する競合窓）があった。骨格が1箇所に集約された機会に、敗者側が `ALREADY_EXISTS` を捕捉して勝者の doc を再取得する形へ原子化した。本番ではメタデータ doc が恒久存在するため実害は無かったが、新規環境・Emulator 初回の正しさのために塞いだ。

### 3. 見送った共通化（過剰一般化の線引き）

| 却下項目 | 理由 |
|---|---|
| 汎用ジョブフレームワーク | 3 endpoint のみ・抽象コスト＞重複コスト |
| youtube 排他ロックと dlsite 継続 cursor の統一 | セマンティクスが逆（二重実行**防止** vs 中断**再開**）。統一は状態機械の発明になる |
| run-scoped metrics の一般化 | `dlsite-read-metrics` は1インスタンスのみで重複が存在しない＝「重複解消が唯一の正当化」を満たさない |
| run サマリログの共通化 | 文言・フィールドが3者3様＝共通化はログ意味変更（Monitoring キー破壊）。「ハンドラ末尾で必ず1回サマリ info ログ」という構造規約で担保する |
| CloudEvent unwrap の抽出 | 設計時点で `shared/pubsub-utils.ts`（`decodePubsubMode`）として既に自然発生的に共通化済みだった |

### 4. 4ファイル案からの逸脱（設計時の想定と実装時の差分）

2026-07-05 の設計コメントは各 endpoint 4ファイルを想定していたが、実装時（2026-07-24）には2点で逸脱した。理由も含めて記録する。

- **youtube は5ファイルになった**: 設計後の3週間で `youtube.ts` が 749→929 行に肥大（#831 の playlist マッピングキャッシュ化+統計ティア化、fast_recheck 追加）。`playlist-mapping.ts` を独立ファイルとして追加した。理由は「通常 run と fast_recheck の両方から使われる独立した凝集単位」であり、`run-video-fetch.ts` に混ぜると再びファイルが肥大するため。
- **関数リネームは見送った**: 設計は `fetchYouTubeVideosLogic`→`runVideoFetch` のリネームを想定していたが、実装時に見送った。`fetchYouTubeVideosLogic` はモード振り分けの入口として既に確立した名前（テスト・ハンドラ双方から参照）であり、リネームの利得が churn に見合わなかった。dlsite 側の `executeUnifiedDataCollection`→`runUnifiedDataCollection` は実施（youtube と異なり、これは新規に `run-*` 規約へ揃える必要があったため）。

## 理由

- **軸2（予測可能性）**: 「この endpoint の本処理はどこか」がファイル名（`run-*.ts`）だけで分かるようになる。
- **軸3（意図と挙動の一致）**: ハンドラ／オーケストレータ／services という責務境界が命名と一致する。
- **段階導入 + 挙動不変の検証戦略**が最大リスク（大きめのリファクタでの挙動変化混入）を抑えた: 各段階を独立 PR にし、`pnpm verify` green と**既存テストのアサーション無変更**（差分は import パスのみ）を合格条件にした。書き換えが必要になった時点で挙動が変わっている証拠、という基準。data-integrity（整合性 cron・One-Way Door 領域）は4検査関数を一字も変えない逐語移動とし、最後に最も慎重に行った。

## 結果

### 良い点

- 3 endpoint すべてが「薄いハンドラ → named orchestrator → services」の統一構成になった。
- 横断処理（metadata get-or-create/update）の重複が解消され、`shared/run-metadata.ts` に集約。TOCTOU も副次的に解消。
- search.list 系 discovery 経路（SPR-230 で実質デッドコード化していた旧経路）も本ストリームの過程で撤去でき、コードベースがさらに縮小した。

### 良くない点・残課題

- `checkDataIntegrity` の `totalChecked` 集計ログが `creatorWorkRestore.checked` を含んでいない（分割前から存在する欠落・実害なし・SPR-270 として別途起票）。

## 参考

- Linear: SPR-231（設計案は2026-07-05コメント・完了報告は2026-07-24コメント）/ 依存: SPR-229・SPR-230
- PR: #850（段階①）/ #851（TOCTOU フォローアップ）/ #852（段階②dlsite）/ #853（search.list 撤去）/ #854（段階③youtube）/ #855（段階④data-integrity・最終）
- 関連: [ADR-009](../infrastructure/ADR-009-deploy-iac-responsibility-split.md)（Cloud Functions のデプロイ責務は Actions 側・本 ADR は endpoint 内部構造）
