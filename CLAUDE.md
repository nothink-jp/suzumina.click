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
- **完了前チェック**: 必ず **`pnpm verify`**（lint + typecheck + test を一括。ローカル pre-push / CI と同一判定。
  各 `vitest.config.ts` のカバレッジ閾値もここで強制される）。個別確認は `pnpm lint` / `pnpm typecheck` / `pnpm test`
- **テスト配置**: `__tests__` ディレクトリに置く（ソースと同居させない）
- **コード品質**: TypeScript strict / Biome 準拠 / 型は `@suzumina.click/shared-types` を使う
- **コード設計**: 純粋関数・短い関数・単一責務を基本に重複を避ける。関連コードは**近接配置（collocation）**し可読性を最優先（軸2の予測可能性に直結）
- **コメント**: 不要なコメントを足さない（自己説明的に）。書くなら**意図・正本・副作用**など軸2–3に効くものを
- **ファイル操作**: 既存編集を優先。新規作成は必要なときだけ。ドキュメント（*.md / README 等）を自動生成しない
- **言語**: 思考は英語、**出力・コメントは日本語**。技術用語は原語のまま。JSDoc を用いる
- **コミット**: Conventional Commits（`feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore`）
- **セキュリティ**: 機密情報を露出・コミットしない
- **禁止**: `firebase` コマンド（Firebase 未使用） / `npm` コマンド
- **ドメイン変更時**: Entity / 値オブジェクトを**変更したとき**は
  [domain-model.md](docs/reference/domain-model.md) / [domain-object-catalog.md](docs/reference/domain-object-catalog.md)
  を更新（新規 Entity 追加は上記ゲートを先に通す）

---

## 2. プロジェクトの座標（事実）

- **URL**: https://suzumina.click ／ Status: PRODUCTION READY
- **構成**: pnpm monorepo — `apps/web`, `apps/functions`, `packages/shared-types`, `packages/ui`, `packages/typescript-config`
  （`apps/admin` は廃止。管理機能は `apps/web` の `/admin` 配下に統合）
- **技術スタック**: Next.js App Router + TypeScript + Tailwind CSS ／ Cloud Functions + Firestore ／
  NextAuth + Discord OAuth ／ Terraform + GCP
  - **バージョンの正は各 `package.json`**（このファイルや docs に版数を固定しない＝軸1の版ズレ防止）
- **Firestore コレクション**: DLsite 作品は **`works`**（命名の正本。旧称や別名で参照しない。
  リネーム経緯は [ubiquitous-language.md](docs/reference/ubiquitous-language.md) を参照）
- **整合性cron**: `checkDataIntegrity`（日曜 3:00 JST）が Circle workIds / 孤立 Creator マッピング /
  Work-Circle 整合を**事後修復**。新たな非正規化はこの負債を増やす点に留意（軸1）
- **実装の既定**: データ操作は Server Actions（`apps/web/src/actions/`）、表示は Server Components を優先、
  再利用コンポーネントは `packages/ui`

### 開発コマンド
```bash
pnpm --filter @suzumina.click/web dev   # 開発サーバー
pnpm verify                              # lint + typecheck + test（CI と同一判定）
pnpm build                               # ビルド
```

---

## 3. 参照ドキュメント（過去判断の記録・毎回は読まない）

能動ルールは §0–2 に集約済み。下記は**必要になった時だけ**参照する背景資料。

- 設計判断: [ADR 索引](docs/decisions/README.md)（Entity 判断は ADR-001 / ADR-005）
- ドメイン: [domain-model](docs/reference/domain-model.md) / [domain-object-catalog](docs/reference/domain-object-catalog.md) / [ubiquitous-language](docs/reference/ubiquitous-language.md)
- アーキ／基盤: [architecture](docs/reference/architecture.md) / [application-architecture](docs/reference/application-architecture.md) / [infrastructure-architecture](docs/reference/infrastructure-architecture.md) / [database-schema](docs/reference/database-schema.md)
- ガイド: [development](docs/guides/development.md) / [testing](docs/guides/testing.md)
- 運用: [changelog](docs/operations/changelog.md) / [todo](docs/operations/todo.md)

---

**Last Updated**: 2026-06-01 ／ **Document Version**: 5.0（SPR-63: ステートレスLLM協働前提に全面再構成）
