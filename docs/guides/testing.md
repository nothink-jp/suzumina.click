# Testing Guide

テスト配置（`__tests__`）・完了前ゲート（`pnpm verify`）の正本は [CLAUDE.md](../../CLAUDE.md)。
ここにはテストの種類と走り方、コードから読み取りにくい方針だけを置く。

## テストの種類と実行経路

| 種類 | 対象 | ローカル | CI |
|---|---|---|---|
| Unit（Vitest） | 各パッケージ（web / functions / shared-types / ui） | `pnpm test`（全体）/ `pnpm --filter <pkg> test` | `pr-check.yml` の `parallel-check`（変更パッケージのみ） |
| Integration（Firestore Emulator 実機） | functions の整合性チェック | `pnpm test:integration` | `pr-check.yml` の `functions-integration`（functions / shared-types 等の変更時） |
| Story play（Vitest browser + Playwright） | `packages/ui` の story | `pnpm --filter @suzumina.click/ui test:storybook` | `storybook-test.yml`（ui / shared-types 変更時） |
| 視覚回帰（Chromatic） | `packages/ui` の Storybook | — | `chromatic.yml`（main push。PR は `chromatic` ラベル時のみ） |
| E2E スモーク（Playwright） | 本番ビルドの web | 下記 | `e2e-smoke.yml`（web / ui / shared-types / fixtures 変更時） |

### Unit（Vitest）

- 設定は各パッケージの `vitest.config.ts`（[web](../../apps/web/vitest.config.ts) /
  [functions](../../apps/functions/vitest.config.ts) / [shared-types](../../packages/shared-types/vitest.config.ts) /
  [ui](../../packages/ui/vitest.config.ts)）。**カバレッジは常時有効で、閾値はパッケージごとに異なる**
  （値は各ファイルが正本。`pnpm test` だけで閾値割れは fail する）
- Firestore はモックする（実接続しない）。web は `@/lib/firestore` を `vi.mock` するのが通例
- **認証は抽象だけをモックする**: サーバ側は `vi.mock("@/lib/auth/server")` を宣言したうえで
  [`@/test-utils/auth-server`](../../apps/web/src/test-utils/auth-server.ts) の `mockCurrentUser()` で戻りを設定、
  クライアント側は `@/test-utils/auth`。better-auth（プロバイダ）を直接モックしない＝認証実装を差し替えてもテストを触らずに済む
- `packages/ui` のレスポンシブ／タッチターゲット検証は `packages/ui/src/test-utils/responsive-testing.ts` を使う

### Integration（Firestore Emulator）

[`scripts/test-functions-integration.sh`](../../scripts/test-functions-integration.sh) が**専用ポート 8765** で
使い捨て Emulator を起動し、`RUN_INTEGRATION_TESTS=true` を立てて
[check-data-integrity.integration.test.ts](../../apps/functions/src/endpoints/data-integrity/__tests__/check-data-integrity.integration.test.ts)
を実行する（既知の壊れデータを注入 → `runIntegrityCheck` → 検出・修正件数と修復後の実体を assert）。

- モックでは検証できない集計ロジックの正しさを見るのが目的（SPR-138）
- 各テストが Emulator のデータを全消去するため、`dev:local`（8080）とポートを分けている。8765 に本物のデータを置かない
- `RUN_INTEGRATION_TESTS` と `FIRESTORE_EMULATOR_HOST` の両方が無いと describe ごとスキップ＝通常の `pnpm test` では走らない
- 実外部 API 系（DLsite の地域制限・スキーマ捕捉）は runner が海外 IP・非決定論のため CI に載せない

## E2E（Playwright）

spec は `apps/web/e2e/`。CI で回すのはファイル名に `smoke` を含む spec のみ（`playwright test smoke`）。

### 本番ビルド向けスモーク（@smoke / prod-build）

SPR-124 のように **`next dev` では再現せず本番ビルド（cacheComponents/PPR/React Compiler が効く）でのみ顕在化する回帰**は、dev サーバ相手の E2E では捕捉できない。これ用に `e2e/smoke.spec.ts`（`@smoke`）を **`next build && next start` に対して**実行する。

```bash
# 本番ビルドを作ってスモークを実行（chromium）
pnpm --filter @suzumina.click/web test:smoke:prod
# 既にビルド済みなら（CI 等）: PLAYWRIGHT_PROD=1 で next start に対して実行
PLAYWRIGHT_PROD=1 pnpm --filter @suzumina.click/web test:e2e:smoke
```

- [`playwright.config.ts`](../../apps/web/playwright.config.ts) は `PLAYWRIGHT_PROD=1` のとき webServer を `next start`（本番）に切り替える。
- CI: `.github/workflows/e2e-smoke.yml` が Emulator 起動 → seed → `next build` → 本番起動 → スモークを実行する。
- `@playwright/test` と `playwright` は **lockstep**（同一バージョン）。ズレると `test.describe() not expected` で起動不能になるため一致させる。

### データ依存スモーク（@data-smoke / Emulator + fixtures）

Firestore のデータに依存する検証は **Emulator + フィクスチャ**（`apps/functions/src/tools/firestore-local/fixtures/*.json`）を正本にして行う（`e2e/data-smoke.spec.ts`）。CI もこの構成で「本番ビルド × Emulator」を実行する。

```bash
# ワンショット（Emulator 起動 + seed + 本番ビルド + smoke/data-smoke 実行）
pnpm test:e2e:emulator
# spec だけ直したい再実行時はビルドを省略できる
PLAYWRIGHT_SKIP_BUILD=1 pnpm test:e2e:emulator
```

- `PLAYWRIGHT_EMULATOR=1` はデータ依存 spec の有効化と同時に、`apps/web/src/lib/firestore.ts` の安全弁（本番 × Emulator 接続拒否）への明示 opt-in を兼ねる。**本番デプロイ環境では決して設定しない**。
- spec に**本番 Firestore の ID をハードコードしない**（CI に存在保証がなく必ず腐る）。ID・タイトルは fixtures を実行時に読んで取得する（`seed:dump` での鮮度更新に追従する）。

### Playwright Agents（e2e の authoring 支援）

e2e spec の新規作成・修復は Playwright Agents（`.claude/agents/playwright-test-{planner,generator,healer}.md` +
ルート `.mcp.json` の `playwright-test` MCP サーバー）で行える。generator は操作を live 実行しながら
role ベースのロケーターを検証済みコードとして記録するため、手書きよりロケーター精度が高い。

- **起動前提**: Firestore Emulator + fixtures（`pnpm emulator` + `pnpm seed`、または `pnpm dev:local`）。
  MCP サーバーには `FIRESTORE_EMULATOR_HOST` が焼き込まれており、dev サーバー（port 3000）が未起動なら
  playwright config の webServer が起動する（起動済みなら再利用）。探索の開始状態は `e2e/seed.spec.ts`（年齢確認通過済み）。
- **フロー**: planner（探索 → `apps/web/specs/` に計画 md）→ generator（計画を live 実行 → spec 生成）→
  healer（失敗 spec の自己修復。直せなければ `test.fixme()` + コメント）。
- **CI への昇格ルール**: 生成 spec をそのままコミットしない。①データ文字列（タイトル・ID）が
  ロケーターに残っていないか（fixtures 実行時読み込みへ置換）、②`PLAYWRIGHT_EMULATOR` ガードの有無、
  ③ファイル名が `smoke` を含むか（CI の実行パターンは `playwright test smoke`）を確認してから昇格する。
