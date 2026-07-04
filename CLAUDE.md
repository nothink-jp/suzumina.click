# suzumina.click — Claude AI 開発ガイドライン（能動ルールの単一ソース）

このファイルは、毎セッション効かせる**能動ルール**の唯一のソース。
ADR・ドメインカタログ等の分散ドキュメントは「過去判断の記録（参照用）」であり、
毎回読み込む前提にはしない（§3）。詳細な索引は [Documentation Index](docs/README.md)。

---

## 0. 協働相手と評価軸（常時適用）

### 前提：レビュー／設計の相手はステートレスなLLM
チームメンバーは LLM（Claude Code 等）。人間と違いセッションごとに記憶がリセットされる。
最適化対象は「長期的な人間間の語彙統一」ではなく、**1セッションで意図がどれだけ正確に
再構築されるか＝相互情報量 I(意図; 理解) の最大化**。含意：

- 意図を伝える信号は「その場で読めるもの」に寄せる
  → 型シグネチャ・命名・近接コメント ＞ 別ファイルに散ったドキュメント群
- 分散docを横断再構築させる構造はステートレスな相手に高コスト。docは「少なく・濃く・近く」を優先

### 軸1：系の劣化（崩れる速さ）
- 不変条件を整合性cron（`checkDataIntegrity`）で**事後修復**している箇所は、
  「設計で守れないか」を先に問う。非正規化の追加は cron の保守負債を増やす
- 参照docを増やさない。版ズレ（例: Next.js のバージョン表記）は情報の不一致＝負債として是正する

### 軸2：読み手の驚き（予測できるか）
- Entity/PlainObject の変換層は「RSC境界の誤り訂正符号」＝**フレームワークに強制された冗長**。
  これは尊重する（潰さない）。新しい変換層・抽象を足す提案は原則却下し、
  足すなら「なぜ既存の層で足りないか」を必ず言語化する
- 命名の予測可能性を最優先（相手は名前から意図を毎回ゼロ再構築するため）

### 軸3：意図と理解の一致（予測が当たるか）← 最優先
- 名前・型の約束と実際の振る舞いのズレを最優先で指摘
  （get/find系の隠れた副作用、責務の広狭、Firestoreコレクション名の混同の再発）
- 一つの概念が複数の姿を持つ場合（例: Work = Entity / PlainObject / Firestoreドキュメント）、
  「どれが正本か」を明示する。正本が曖昧な箇所はそれ自体を欠陥として扱う

### Entity化のゲート（新規ドメインに Entity を作る前に必ず確認）
次のいずれも満たさなければ「型定義 + ユーティリティ関数」に留める：
- ビジネスルールが5個以上ある、または
- 明確な状態遷移がある（例: draft→published→archived）、または
- 不変条件が複雑

※「他の Entity が成功したから」は理由にしない（過剰一般化の禁止）。判断の背景は ADR-001 / ADR-005。

### ソロ開発として意図的に降ろす儀式
ADR・ドメインカタログ等は「過去の判断の記録」であって毎セッションの能動ルールではない。
LLM に毎回全部読ませて再構築させない。能動的に効かせたいルールは**この CLAUDE.md に昇格し一元化**する。

---

## 1. 能動ルール（必ず守る）

- **パッケージマネージャ**: pnpm のみ。npm は禁止（`pnpm test` / `pnpm dev` / `pnpm build`）
- **完了前チェック**: 必ず **`pnpm verify`**（lint:docs + lint:tokens + lint + typecheck + test を一括・各 `vitest.config.ts` のカバレッジ閾値も強制）。
  これが手元の**完全版ゲート**。pre-push hook（lefthook）は変更パッケージの `typecheck:fast`（tsgo）のみで lint/test を含まず、
  CI（`pr-check.yml`）は変更パッケージ単位の差分実行と scope が異なる（＝同一判定ではない）。最終確認は `pnpm verify` を正とする。
  個別確認は `pnpm lint` / `pnpm typecheck` / `pnpm test`。doc・トークンの整合は次の2つ:
  - `pnpm lint:docs`: docs のリンク整合 + 型 shape 転記禁止。ポインタ doc のリンク腐敗＝#652 型 drift・転記の再混入を弾く（`scripts/lint-docs.mjs`・SPR-205）
  - `pnpm lint:tokens`: globals.css の `:root` トークンで「定義あり・参照なし」を弾く＝chart-*/a11y 型の死にトークン再混入防止（`scripts/lint-css-tokens.mjs`）
- **テスト配置**: `__tests__` ディレクトリに置く（ソースと同居させない）
- **コード品質**: TypeScript strict / Biome 準拠 / 型は `@suzumina.click/shared-types` を使う
- **コード設計**: 純粋関数・短い関数・単一責務を基本に重複を避ける。関連コードは**近接配置（collocation）**し可読性を最優先（軸2の予測可能性に直結）
- **ファイル命名**: ファイル名は **kebab-case**（例: `work-card.tsx` / `use-list-url.ts`）。export 識別子は従来どおり（component=PascalCase / hook・関数=camelCase）。Next.js 規約ファイル（`page.tsx` 等）は対象外。Biome `useFilenamingConvention`（`filenameCases:["kebab-case"]` / `requireAscii`＝英数のみ・日本語ファイル名禁止）で強制（SPR-154）
- **コメント**: 不要なコメントを足さない（自己説明的に）。書くなら**意図・正本・副作用**など軸2–3に効くものを
- **ファイル操作**: 既存編集を優先。新規作成は必要なときだけ。ドキュメント（*.md / README 等）を自動生成しない
- **言語**: 思考は英語、**出力・コメントは日本語**。技術用語は原語のまま。JSDoc を用いる
- **コミット**: Conventional Commits（`feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore`）
- **セキュリティ**: 機密情報を露出・コミットしない
- **禁止**: `firebase` コマンド（Firebase 未使用） / `npm` コマンド
- **ドメイン変更時**: Entity / 値オブジェクトを**変更したとき**は
  [domain-model.md](docs/reference/domain-model.md) を更新（新規 Entity 追加は上記ゲートを先に通す）。
  ただし同 doc はポインタのみ（フィールド・型 shape は転記しない＝正本は `packages/shared-types`）。
  型のリネーム程度では更新不要で、正本の在処（リンク先）が変わったときだけ直す（SPR-205）
- **Firestore 複合インデックス**: 正本は terraform（`firestore_indexes.tf` + `firestore_indexes_audiobuttons_update.tf`）。
  クエリに `where`+`orderBy` / 複数 `where` / array-contains+条件 / `collectionGroup` を**足したら同じ PR で index も追加**し live と乖離させない。
  Emulator は複合インデックスを強制しないため新規クエリは ADC 直結／live で要検証（§2 ローカル方針）。
  クエリを in-memory フィルタへ移行 or フィールド/コレクションを改名したら**対応する旧 index を同時に撤去**（残すと孤立 index 化）。
  `FAILED_PRECONDITION`（index 要求エラー）を catch で握りつぶさない（最低ログ。silent fallback は欠落を隠す）。
  drift 点検は `pnpm check:index-drift`（live↔config 突合）、本番欠落は監視アラート、削除はクエリ→index 対応で未使用確認後（背景: SPR-213）
- **Firestore 時刻フィールド**: 新規コレクション・新規フィールドの日時は Firestore `Timestamp` で保存する。
  既存は string ISO（works / audioButtons / users / contacts）と Timestamp（circles / creators / evaluations / ba_*）が
  混在しており、一括移行はしない（既存フィールドの型は現状維持。実測マップは SPR-75 調査コメント参照）

### セルフマージ・ポリシー（ソロ開発 / AIレビュー = SPR-37）
PR は「やり直しが効くか」で自己マージ可否を分ける。AI レビュー（`.github/workflows/claude-review.yml`、Claude Code Action）は
**補助であって承認権限ではない**（必須チェックにしない・最終判断は唯一のレビュアー＝あなた）。

- **Two-Way Door（戻せる）= AI レビューのみで自己マージ可**: UI/表示、軽微なロジック、戻せる API 改修など。
  Claude AI Review が重大所見（blocker/major）を出さなければマージしてよい。
- **One-Way Door（戻せない）= 必ず自分でレビューしてからマージ**: 次を含む変更は AI 任せにしない。
  Firestore スキーマ/非正規化、整合性 cron（`checkDataIntegrity`）、better-auth/Discord 認証・認可、
  Terraform/GCP インフラ、`.github/workflows`（CI/CD）、`packages/shared-types` の破壊的変更、新規 Entity 追加。
- **AI の死角**は自分で見る: 非正規化 → 整合性 cron 負債の連関（軸1）など、AI が取りこぼす系の劣化は人が判断する。

---

## 2. プロジェクトの座標（事実）

- **URL**: https://suzumina.click ／ Status: PRODUCTION READY
- **構成**: pnpm monorepo — `apps/web`, `apps/functions`, `packages/shared-types`, `packages/ui`, `packages/typescript-config`
  （`apps/admin` は廃止。`/admin` 画面・admin/moderator ロールも SPR-164 で撤去＝ユーザーは認証/isActive のみで区別）
- **技術スタック**: Next.js App Router + TypeScript + Tailwind CSS ／ Cloud Functions + Firestore ／
  better-auth + Discord OAuth ／ Terraform + GCP
  - **バージョンの正は各 `package.json`**（このファイルや docs に版数を固定しない＝軸1の版ズレ防止）
- **Firestore コレクション**: DLsite 作品は **`works`**（命名の正本。旧称や別名で参照しない。
  リネーム経緯は [ubiquitous-language.md](docs/reference/ubiquitous-language.md) を参照）
- **整合性cron**: `checkDataIntegrity`（日曜 3:00 JST）が Circle workIds / 孤立 Creator マッピング /
  Work-Circle 整合を**事後修復**。新たな非正規化はこの負債を増やす点に留意（軸1）
- **実装の既定**: データ操作は Server Actions、表示は Server Components を優先、再利用コンポーネントは `packages/ui`
  - **Server Actions の正本は `apps/web/src/actions/`**（SPR-192 で確定。`app/*/actions.ts` の route 同居は段階的に移行）。
    共有層（`src/actions/`）から route 層（`app/*/actions.ts`）への逆依存は禁止。
    カウンタ更新は `lib/firestore-helpers` の `updateCounter` を直接使う
  - **書き込み系の認可ゲートの正本は `getCurrentUser()` の null チェック**で error を返す（SPR-195）。
    `withAuthenticatedAction` ラッパー・favorites/evaluation/settings も**この null チェックを使う点で同じ**。
    `requireAuth()` は `redirect()` を投げるため **Server Action の try/catch 内では使わない**
    （NEXT_REDIRECT が catch に飲まれる）。redirect は RSC/ページ側（ProtectedRoute 等）で行う。
    - **`isActive=false`（無効ユーザー）のブロックは一律ではない**：`toggleReaction` /
      `getLikeDislikeStatusAction` は `requireAuth`（無効ユーザーを弾いていた）からの置換で `!user.isActive` を明示ブロックするが、
      `withAuthenticatedAction` 経由の buttons 更新/削除や favorites/evaluation/settings は現状 isActive を見ない。
      「全書き込み系で無効ユーザーを一律ブロック」する統一は未実施（今後のタスク）。新規 action では正本の null チェックに揃え、
      無効ユーザーも弾くべき破壊的操作なら `!user.isActive` を併記する。

### 開発コマンド
```bash
pnpm dev:local                          # 推奨: Firestore Emulator 起動 + シード投入 + web dev（ADC 不要・本番に触れない）
pnpm --filter @suzumina.click/web dev   # 本番 Firestore 直結（ADC 必須。データ確認や本番調査時のみ）
pnpm verify                             # lint + typecheck + test（CI と同一判定）
pnpm build                              # ビルド
```

### ローカル Firestore（Emulator と ADC 直結の二系統）
ローカルは **2 つの接続先**を用途で使い分ける。どちらかが上位互換ではない。

- **`pnpm dev:local`（既定 / Firestore Emulator）**：gcloud 版 Emulator（`gcloud emulators firestore start`、`firebase`
  コマンドは使わない＝§1 の禁止を順守）を起動し、シード投入後に web dev を立ち上げる。
  `@google-cloud/firestore` は `FIRESTORE_EMULATOR_HOST` を見て自動接続する（ダミー認証＝**ADC 不要**）。
  データは**ハイブリッド方式**：`apps/functions/src/tools/firestore-local/fixtures/*.json`（公開系のみ・コミット対象）を
  `pnpm seed` で投入し、鮮度更新は `pnpm seed:dump`（ADC 1 回で本番から再取得）。ユーザー機微系は dump 対象外。
  個別操作: `pnpm emulator`（Emulator のみ） / `pnpm seed`（投入のみ） / `pnpm seed:dump`（本番→fixtures 更新）。
  安全弁: 本番 (`NODE_ENV=production`) で `FIRESTORE_EMULATOR_HOST` が設定されていたら接続を拒否する（両 `firestore.ts`）。
- **`pnpm --filter @suzumina.click/web dev`（ADC 直結 / 本番 Firestore）**：ADC 必須。本番に直接読み書きする。

**使い分けの原則**
- 既定は **Emulator**：UI/機能開発・破壊的操作を伴う実験・スクショ/E2E。安全（本番に触れない）・高速・無課金・決定論的。
- **ADC 直結に切り替える**のは次の 3 つ：
  1. **本番データ起因バグの調査**（TZ パース・merge の sticky フィールド等、実データが無いと再現しない類）
  2. **新規クエリのインデックス検証**（Emulator は複合インデックスを強制しないため、ローカルで通っても本番で
     `FAILED_PRECONDITION` になる。新しい `where + orderBy` 追加時は ADC 直結か本番で要確認）
  3. **ユーザー系・サブコレクションを含む網羅確認**（Emulator には users/favorites/evaluations や
     `works/{id}/priceHistory` を投入しない。ログインは可だが role は既定 `member`、価格チャートは空）

**いつ Emulator を立ち上げるか（毎セッションの判断・能動ルール）**
原則は **lazy start**：セッション開始時に先回りで起動しない。**ブラウザ preview での確認が必要だと判断した直前**にだけ
`pnpm dev:local` を実行する。判断は 2 段で行う。

1. **そもそもブラウザ確認が要るか**（preview の `<when_to_verify>` と同基準）。要らないなら Emulator も不要：
   - ドキュメント/コメントのみ・型/lint・ユニットテストで完結する変更（テストは Firestore をモックするため
     `pnpm verify` に Emulator は不要）
   - preview で再生できない領域（`apps/functions` ランタイム、Terraform、CI、ビルド設定）
   - 解析・調査・質問のみ、Firestore に触れない UI（必要なら Storybook で足りる）
2. **ブラウザ確認が要る** なら接続先を選ぶ：
   - Firestore 由来の表示・読み書きを確認 → **Emulator（`pnpm dev:local`）**。書き込みを伴う実験もこちら（安全）
   - 上の「ADC 直結に切り替える 3 条件」に当たる → **ADC 直結（`pnpm dev`）**
   - Firestore に触れない見た目だけの確認 → Emulator なしで素の `pnpm --filter @suzumina.click/web dev` でも可

Emulator はメモリ常駐で再起動ごとに再シードが要る点、初回は component 導入（約65MB）がある点もコスト要因。
迷ったら「この変更は Firestore データを描画/更新してブラウザで観測できるか？」を基準にし、No なら立ち上げない。

---

## 3. 参照ドキュメント（過去判断の記録・毎回は読まない）

能動ルールは §0–2 に集約済み。下記は**必要になった時だけ**参照する背景資料。

- 設計判断: [ADR 索引](docs/decisions/README.md)（Entity 判断は ADR-001 / ADR-005）
- ドメイン: [domain-model](docs/reference/domain-model.md) / [ubiquitous-language](docs/reference/ubiquitous-language.md)
- アーキ／基盤: [architecture](docs/reference/architecture.md) / [application-architecture](docs/reference/application-architecture.md) / [infrastructure-architecture](docs/reference/infrastructure-architecture.md) / [database-schema](docs/reference/database-schema.md)
- ガイド: [development](docs/guides/development.md) / [testing](docs/guides/testing.md)
- 運用: [changelog](docs/operations/changelog.md) / [todo](docs/operations/todo.md)

---

**Last Updated**: 2026-06-01 ／ **Document Version**: 5.0（SPR-63: ステートレスLLM協働前提に全面再構成）
