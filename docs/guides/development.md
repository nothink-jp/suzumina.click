# Development Guide

能動ルール（pnpm のみ・`pnpm verify`・kebab-case・`__tests__`・Conventional Commits・Entity 化のゲート・
セルフマージ・ポリシー・ローカル Firestore の使い分け）の正本は [CLAUDE.md](../../CLAUDE.md)。
ここには**コードや設定から即座には読み取れない運用判断と層の意図**だけを置く。
版数・件数・カバレッジ値は書かない（正本は各 `package.json` / `vitest.config.ts`）。

## Git worktree での並行開発（Claude Code）

Claude Code は worktree を既定で `.claude/worktrees/<name>/` に作成する（[ADR-008](../decisions/architecture/ADR-008-git-worktree-friendly-monorepo.md)）。本リポジトリは worktree 開発を以下で自動化している。

- **依存の自動初期化**: 新規 worktree で最初にセッションを開くと、`SessionStart` フック（`.claude/settings.json` → `.claude/hooks/worktree-bootstrap.sh`）が `mise trust` + `pnpm install` を一度だけ実行する（`node_modules` 有無でガード。初回は数分かかる）。
- **gitignore ファイルの自動コピー**: `apps/web/.env` 等は `.worktreeinclude` に列挙され、worktree 作成時に main から自動コピーされる（CLI `--worktree`・subagent・macOS アプリ共通）。
- **走査除外**: `.claude/worktrees/` は `.gitignore` / `.secretlintignore` / `biome.json` で除外済み。

```bash
# Claude Code でネイティブに worktree を作成・起動
claude --worktree feature-x

# 手動で作成する場合（フックが依存インストールと .env コピーを補完する）
git worktree add .claude/worktrees/feature-x -b feature-x
cd .claude/worktrees/feature-x && claude

# 複数 worktree で web を同時起動するときはポートを分ける（next dev は PORT を尊重）
PORT=3001 pnpm --filter @suzumina.click/web dev
```

- **main は ruleset で保護**（squash マージのみ）。直接 push せず PR 経由でマージする。取り消しも `git revert` を PR で入れる
- **ブランチ名**: `feature/` / `fix/` / `docs/` / `chore/` + 内容（Claude Code の `--worktree` は `worktree-<name>` を自動命名）

## コマンドの使い分け（CLAUDE.md に無いもの）

起動は既定 `pnpm dev:local`（Emulator）。`pnpm --filter @suzumina.click/web dev` は**本番 Firestore 直結**なので
CLAUDE.md §2 の 3 条件に当たるときだけ使う。完了前ゲートは `pnpm verify` 一本。

| コマンド | 用途・注意 |
|---|---|
| `pnpm lint` / `pnpm check` | `lint` は検出のみ、`check` は Biome `--write` で**書き換える** |
| `pnpm typecheck` / `pnpm typecheck:fast` | `typecheck` は tsc（CI と同じ正のゲート）、`:fast` は tsgo（ローカル・pre-push 用の高速版） |
| `pnpm secretlint` | 全ファイルのシークレット検出（pre-commit は staged のみ） |
| `pnpm knip` | プロジェクト横断の未使用検出（下記） |
| `pnpm --filter @suzumina.click/ui storybook` | Storybook（`packages/ui`） |
| テスト系 | [testing.md](testing.md) |

**Git フック（[lefthook.yml](../../lefthook.yml)）と各ゲートの scope の違い**

| 契機 | 実行内容 | 備考 |
|---|---|---|
| pre-commit | staged ファイルに `biome check --write` + `secretlint` | 整形は自動 stage。シークレット検出時はコミット中止 |
| pre-push | 変更パッケージの `typecheck:fast` のみ | lint / test は含まない |
| CI（`pr-check.yml`） | 変更パッケージ単位の lint / typecheck / test ほか | 差分実行なので verify と同一判定ではない |
| `pnpm verify` | 全パッケージ | **最終確認の正**（CLAUDE.md §1） |

デプロイは main マージで自動。手順・ロールバックは [deployment.md](deployment.md)。

## 未使用コード検出 (knip)

手動 grep ベースの棚卸しは barrel / 直接パス import の両方を漏れなく追えず誤判定が起きやすい
（SPR-116 で現役の `ValidationMessage` を未使用と誤判定）。これを補うため
[knip](https://knip.dev) を導入している（SPR-117）。

- **役割分担**: Biome は「ファイル内の未使用（変数・import）」、knip は
  「**プロジェクト横断の未使用（export・ファイル・依存・devDeps）**」。両者は競合しない。
- **実行**: `pnpm knip`（root から）。設定は [`knip.json`](../../knip.json)。
  pnpm workspace を自動認識し、Next.js / Storybook / Vitest の規約は plugin が entry として扱う。
- **CI**: `.github/workflows/knip.yml` が PR で実行するが **非ブロッキング**（`continue-on-error`）。
  PR を fail させず、結果はジョブログで確認する。
- **削除判断はツール任せにしない**: 検出はあくまで棚卸しの**補助**。特に共有ライブラリ
  （`packages/ui`）には将来用に残す public API があり得る（軸1/軸3）。候補は 1 つずつ
  「本当に未使用か（直接パス import・規約ファイル・動的参照を含め）」を確認してから削除する。
- **誤検知の整理**: 設定ファイル/CLI 経由でのみ参照される依存（secretlint ルール等）や、
  vitest の alias 経由で参照されるモック（`apps/web/vitest-mocks/`・`packages/ui/.storybook/mocks/`）は
  `knip.json` の `ignore` / `ignoreDependencies` で除外済み。新たな誤検知が出たら同様に設定で整理する。

## データ表現とレイヤ構成（shared-types）

**正本は [packages/shared-types/src/](../../packages/shared-types/src/) のツリーそのもの**で、概念ごとの
正本の在処は [domain-model.md](../reference/domain-model.md) が索引になっている。ここには層の**意図**だけを
書き、ファイル一覧・型 shape は転記しない（転記した瞬間からリネームで drift するため）。

**層の分割軸は「何に対して責務を負うか」**:

| 層 | 責務 |
|---|---|
| `api-schemas/` | 外部 API レスポンスの薄い写し取り。変換ロジックを持たない |
| `entities/` | 永続データ（Firestore Document）の Zod スキーマと、そこから導く型・定数 |
| `types/` | Zod を持たない概念の型定義と型ガード（Firestore Document 形を含む） |
| `plain-objects/` | RSC 境界を越えるデータ形。整形済みの値と派生値（`_computed`）を含む |
| `transformers/` | Firestore Document ⇄ PlainObject の純関数変換 |
| `operations/` | PlainObject に対する判定・表示の純関数 |
| `utilities/` | 検証・整形（ID 検証・日付正規化・フォーマッタ・Document ⇄ Plain の個別変換） |
| `core/` | 型システム基盤（branded types・`Result`） |

層をまたぐ import に**一方向の制約は課していない**（`utilities/` が `entities/` の型を参照する、
`transformers/` が `operations/` を呼ぶ等は実在する）。Document ⇄ PlainObject の変換も
`transformers/` に集約しきれてはおらず、Circle だけ
[circle-conversions.ts](../../packages/shared-types/src/utilities/circle-conversions.ts) にある。
新しい変換を書く前に、対象ドメインの既存の変換がどこにあるかを確認すること。

**クラス Entity もクラス値オブジェクトも存在しない**（ADR-006 / SPR-181 で撤去済み）。「値オブジェクト」は
PlainObject のネストしたプロパティ群を指す概念表記であって、メソッドを持つオブジェクトではない。
整形済み文字列や判定フラグは **transformer が変換時に算出して PlainObject のフィールドに載せる**
（`work.price.formattedPrice` のように読むだけで、`price.isFree` 等の判定を各所で書き直さない）。
フィールドに載らない判定は `operations/` の純関数に置く。

Document ⇄ PlainObject の変換層は RSC 境界に強制された冗長であり、**ここに新しい変換層・抽象を足さない**
（CLAUDE.md 軸2）。

**インポートはルートバレルからのみ**（`package.json` の `exports` は `"."` だけで、サブパスは解決できない）:

```typescript
// ✅ 唯一の入口
import { type WorkPlainObject, workTransformers, canCreateAudioButton } from '@suzumina.click/shared-types';

// ❌ 解決されない（exports に無い）
import { workTransformers } from '@suzumina.click/shared-types/transformers/work-firestore';
```

**読み取り境界の典型**（Firestore Document → Zod で検証 → transformer で PlainObject → 表示・判定）:

```typescript
const doc = parseWorkDocument(snapshot.data());     // Zod safeParse の漏斗（apps/web/src/app/works/utils/work-converters.ts）
const work = workTransformers.fromFirestore(doc);   // WorkPlainObject
work.price.formattedPrice;                          // 整形は変換時に済んでいる
canCreateAudioButton(video);                        // 判定は operations の純関数
```

**書き込み方向は Work だけ非対称**。Video / AudioButton は `transformers/` に `toFirestore` を持つが、
Work は持たず、DLsite raw API → `WorkDocument` の写し替えは functions 側の薄い mapper が担う
（[work-mapper.ts](../../apps/functions/src/services/mappers/work-mapper.ts)）。mapper が行うのは
フィールドの写し替えと正規化までで、ドメイン判定は持ち込まない。

## コンポーネントとディレクトリの配置

**ディレクトリ一覧・ファイル一覧はここに転記しない。** 正本はツリーそのもので、`ls` すれば分かるものを
doc に写せば追加・削除・リネームのたびに必ず drift する（`pnpm lint:docs` はリンク整合しか見ないため
ファイル一覧の腐敗は機械検出できない）。ここには**配置の判断基準**だけを書く。

| 置き場所 | 使うとき |
|---|---|
| `apps/web/src/app/<route>/components/` | そのルート専用で他から import されない（route 同居） |
| `apps/web/src/components/<domain>/` | 複数のルートから使う、またはドメインの語彙で独立して説明できる |
| `packages/ui` | web アプリのドメイン知識を持たない汎用 UI（`ui/` = shadcn ベース・`custom/` = 自作。shadcn の扱いは [ADR-011](../decisions/frontend/ADR-011-shadcn-ui-maintenance-policy.md)） |

- `src/components/` の分割軸は**機能ドメイン**（音声ボタン・作品・動画・レイアウト・同意 等）であり、
  `hooks/` `utils/` のような技術レイヤーでは切らない。新規ドメインディレクトリを作るのは、
  既存のどのドメインの語彙でも説明できず、かつ 2 ファイル以上になるときに限る
- そのコンポーネント専用のフックは隣に置く（例: `components/audio-button-detail/use-audio-button-hero-state.ts`）
- **バレルエクスポート（`index.ts`）は新規に作らない**。import は `@/components/<domain>/<file>` と
  ファイルを直接指す（既存の `index.ts` は少数の例外）。バレルは「どのファイル由来か」を読み手から隠す
- `apps/functions/src/` は `endpoints/`（Cloud Functions 入口・[ADR-013](../decisions/architecture/ADR-013-cloud-functions-endpoint-architecture.md)）・
  `services/`（ドメインロジック）・`infrastructure/`・`shared/`・`tools/`（ローカル Firestore シード等）で切る
- デザイントークンの正本は `packages/ui/src/styles/globals.css`。Storybook 上の説明は
  `packages/ui/src/components/design-tokens/*.mdx`（トークン変更時は併せて更新）

## Server Actions と API Route

Server Actions の正本の在処・認可ゲートは CLAUDE.md §2。ここではそれ以外の判断基準:

- **API Route は外部から HTTP で叩かれる必要があるものに限る**（現存は `apps/web/src/app/api/` の
  `auth`（better-auth）・`dev`（ローカル開発ログイン）・`health`（コンテナ起動確認）のみ）。
  データ取得・フォーム・CRUD は Server Actions にする
- **キャッシュ再検証は操作の性質で分ける**:
  - 再生数などの統計カウンタは **`revalidatePath` しない**。クライアントでデバウンス・バッチし fire-and-forget で送る
    （[use-play-count.ts](../../apps/web/src/hooks/use-play-count.ts)）。再検証するとページ再描画とサーバ負荷が連打される
  - 即時反映が必要なユーザー操作（評価・設定・問い合わせ）は `revalidatePath` する
    （例: [evaluation-actions.ts](../../apps/web/src/app/works/[workId]/evaluation-actions.ts)）
  - 一覧の `use cache` 境界と読み取りコストの考え方は CLAUDE.md §1「一覧の読み取りコスト」
- `@google-cloud/firestore` はサーバ側専用。クライアント SDK（`firebase/*`）は使わない
