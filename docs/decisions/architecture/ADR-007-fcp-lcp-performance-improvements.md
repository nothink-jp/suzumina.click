# ADR-007: FCP/LCP パフォーマンス改善の意思決定記録（SPR-9 シリーズ）

## ステータス

承認済み（FCP/LCP トラックは完了。残課題は SPR-82 に分離）

## コンテキスト

本番計測で **FCP 3.0s / LCP 6.0s（Mobile）** という遅さが顕在化し、[SPR-9](https://linear.app/nothink/issue/SPR-9) を親トラッキングとして perf シリーズ（SPR-2〜82）を開始した。改善は単一の施策ではなく、**インフラ → レンダリング → データ取得 → バンドル → hydration** の各層にわたる多数の小さな決定の積み重ねで進めた。

本 ADR は、それらの決定と理由、そして最終的に到達した **構造的な限界（framework hydration の床）** を一箇所に集約し、将来の自分（および LLM 協働者）が「なぜこの構成なのか」「どこまでやってどこで止めたのか」を理解できるようにする。

## 決定事項

施策は層ごとに整理する。各項に対応する Linear Issue を併記する。

### 1. インフラ層

| 決定 | 内容 | Issue |
| --- | --- | --- |
| **Cloudflare CDN を前段化** | 全リクエストが Cloud Run に直撃していた構成を改め、CDN エッジキャッシュを導入。TTFB の最大要因を解消 | SPR-2 |
| **Cloud Run 構成変更** | `cpu=500m` + `cpu_idle=true` → **1vCPU + `cpu_idle=false`**。アイドル後初回の実質コールドスタートを緩和 | SPR-3 |

### 2. レンダリング層

| 決定 | 内容 | Issue |
| --- | --- | --- |
| **PPR / Cache Components 採用** | `cacheComponents: true` を有効化。静的シェルを即時返却し、動的部（Firestore データ）を後から streaming。`connection()` で動的境界を明示 | SPR-4 |
| **Cache-Control / unstable_cache 整合** | CDN の `s-maxage`/`stale-while-revalidate` と `unstable_cache` の revalidate を一致させ、エッジ + データキャッシュを二段で効かせる。auth ページは `private, no-store` | SPR-8, SPR-66 |
| **third-party script の遅延化** | SPR-5 で GTM/GA4 の script 遅延化 + preconnect を導入し、その後 `next/script strategy="lazyOnload"`（`load` 後ロード, PR #435）へ強化して LCP を非ブロックに | SPR-5, SPR-9 (#435) |
| **AgeVerification を overlay 方式に** | 年齢確認をコンテンツブロッキングから **overlay（content 非ブロック）** へ変更。content を先に描画し overlay を後乗せ | SPR-7 |

### 3. データ取得層

| 決定 | 内容 | Issue |
| --- | --- | --- |
| **画像 LCP の SSR 化** | list 項目の `<img>` を SSR 出力し、LCP 画像に `fetchpriority="high"` を明示伝播。spinner gate を撤廃 | SPR-73, SPR-76 |
| **N+1 解消 + denormalize** | `/creators` の直列 await を `Promise.all` 並列化し、さらに `workCount`/`types` を CreatorDocument に denormalize して サブコレクション読みを回避。`unstable_cache(60s)` でラップ | SPR-74 |

### 4. バンドル層（First Load JS 削減）

| 決定 | 内容 | Issue |
| --- | --- | --- |
| **Zod chunk を初期ロードから排除** | Zod schema と同居していた純粋 helper を Zod-free モジュールに分離（14→1 ページ）。最後の `/contact` は `ContactForm` を client wrapper 経由で `dynamic({ ssr: false })` 化し、Zod(約285KB)/react-hook-form を遅延チャンクへ。全ページから初期 Zod を排除 | #437, SPR-72, SPR-69 |

### 5. Hydration 層

| 決定 | 内容 | Issue |
| --- | --- | --- |
| **非クリティカル global client の遅延 hydration** | 全ページ mount の PerformanceMonitor / PageViewTracker / CookieConsentBanner / AgeVerificationOverlay を `React.lazy` + mounted gate で hydration 後に遅延化。critical window の main-thread 占有を削減 | SPR-81 WS-A |

## 重要な発見と方針転換

### framework hydration の床（SPR-81 WS-B）

`next experimental-analyze`（Turbopack 用）で代表 list ページの共有チャンク（約 756KB）を分解した結果:

- **約 52%（~395KB）が削減不可能なフレームワーク**: react-dom 226KB + Next.js App Router client runtime 105KB + next/navigation 64KB。
- 残りも **常時表示の global UI（@radix-ui primitives, next-auth/SessionProvider, sonner/Toaster, AgeVerification）に紐づく**ため easy cut なし。

→ **共有チャンク削減では list ページの LCP（~4.5s）を 2.5s まで closing できない**。要因は「framework hydration の床」＋「per-page の `ConfigurableList` 項目の client-side 描画」。

### `ConfigurableList` の server 描画化は分離・保留（SPR-82）

残る唯一の構造的レバーは、[SPR-21](https://linear.app/nothink/issue/SPR-21) spike が P1 として指摘した **`ConfigurableList` の項目を Server Component 描画（Composition パターン）にして hydration パスから外す**ことだが、以下の理由で**大改修の割に payoff が不確実**と判断し、独立 Issue [SPR-82](https://linear.app/nothink/issue/SPR-82) に切り出して保留した:

- 全 list ページ（works/videos/creators/circles/buttons）が使うコア共有 component の API 変更で regression リスクが高い。
- カードの interactive 部分（お気に入り/再生/低評価）は server 描画にしても hydration が残る。
- framework hydration の床が残るため LCP ≤ 2.5s 到達は保証されない。
- PSI v5 API が LCP 要素を返さず、現状 list LCP が「画像読込 bound」か「render-delay bound」か未確定のまま大改修するのはリスキー。

## 計測方針（メタ決定）

施策本体と同じくらい、**計測の進め方**を決定として残す:

1. **計測駆動 + small-batch**: 「計測 → 仮説 → 小さい検証 PR → 効果実測 → continue/break/pivot」を 1 サイクルとする。最初に大きな PR を出さない。
2. **本番検証を必須化**: 「ローカル成功 ≠ 本番成功」。デプロイ後に production の実応答（HTML の script chunk / PSI）を取得してクロスチェックする。
3. **確定指標を優先**: PSI single-sample は ±1-2s の variance があるため、LCP/TTI の単発値だけで判断しない。**プリレンダ HTML の First Load JS / bundle 構成という決定論的指標**を主軸に、PSI は補助・複数サンプルで扱う。
4. **計測の死角を先に潰す**: PSI が計測不能（FAILED_DOCUMENT_REQUEST / PAGE_HUNG）なページの解消を前提作業とした（SPR-70, SPR-68）。

## 結果

### 達成（良い点）

- **LCP の累積改善**: `/` Mobile LCP は起点 6.2s 相当から **~2.7s** へ（PSI variance 込み）。FCP は全ページ 1.2s 前後で安定。
- **First Load JS の大幅削減**: `/contact` 1117.7KB → 885KB（Zod 排除）。全ページから初期 Zod chunk を排除。global client 遅延化で各ページ -10〜13KB。
- **データ取得の健全化**: N+1 解消・denormalize・unstable_cache 整合により `/creators` 等の TTFB/TBT を改善。
- **計測基盤の確立**: 本番 First Load JS / Zod chunk / PSI を再現可能なスクリプトで検証する運用が定着。

### 限界・残課題（悪い点）

- **list ページ（/videos /works）の LCP は ~4.5s で 2.5s 未達**。これは共有チャンク削減や小施策では解消できず、**framework hydration の床**＋ConfigurableList 項目 hydration が要因。残改善は SPR-82（保留中・payoff 不確実）。
- **RUM 継続性の要確認**: PerformanceMonitor（web-vitals）を遅延化したため、GA4 への web-vitals イベント継続を別途確認する必要がある（buffered observer のため理論上は欠落しない）。

## 参考

- 親トラッキング: [SPR-9](https://linear.app/nothink/issue/SPR-9)（FCP/LCP 改善）, [SPR-71](https://linear.app/nothink/issue/SPR-71)（Mobile LCP 2.0s epic）, [SPR-81](https://linear.app/nothink/issue/SPR-81)（hydration / TTI epic）
- 個別施策: SPR-2〜8, SPR-65, SPR-66, SPR-68〜70, SPR-72〜74, SPR-76
- 調査: [SPR-21](https://linear.app/nothink/issue/SPR-21)（Next.js ベストプラクティスギャップ spike）
- 保留: [SPR-82](https://linear.app/nothink/issue/SPR-82)（ConfigurableList server 描画化）
- 関連（対象外）: [SPR-75](https://linear.app/nothink/issue/SPR-75)（Cloud Firestore Documents 設計見直し epic — SPR-71 に related だが perf-metric ではない別系統の設計 epic。本トラックの完了判定には含めない）
- 関連 ADR: [ADR-003](ADR-003-firestore-query-optimization.md)（Firestore クエリ最適化）
- 書籍: [Next.js の考え方](https://zenn.dev/akfm/books/nextjs-basic-principle)（akfm）
