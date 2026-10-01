# アプリケーションアーキテクチャ

コードを読めば分かる構成（ディレクトリ・スタック・版数）は書かない。ここにはコードから直接は復元しにくい**方針**だけを置く。
能動ルールの正本は [CLAUDE.md](../../CLAUDE.md)、版数の正本は各 `package.json`。

- GCP インフラ: [terraform/README.md](../../terraform/README.md) のファイル索引
- ドメイン表現（PlainObject / Zod / transformers）: [domain-model.md](domain-model.md)
- Firestore コレクション台帳: [database-schema.md](database-schema.md)

## 配置の既定

- **Server Actions の正本は `apps/web/src/actions/`**（SPR-192。route 同居の `app/*/actions.ts` は段階移行中。CLAUDE.md §2）。
- API Routes は `app/api/` の `auth`（better-auth）/ `health` / `dev`（ローカル開発ログイン専用・本番は 404）のみ。データ操作は Server Actions に寄せる。
- **認可は「認証済みか + `isActive`」だけ**。Discord Guild 所属は認可には使わず、音声ボタン作成の日次上限にのみ影響する
  （[rate-limit-utils.ts](../../apps/web/src/lib/rate-limit-utils.ts) の `calculateDailyLimit`）。

## エラーページ / アクセス制御の応答方針（SPR-169）

ロールベース認可は廃止済み（admin/moderator なし。SPR-164）。「認証済みだが権限不足」の典型 403 シナリオが存在しないため、
**専用の 403 ページは設けない**。

| 状況 | 応答 | 実装 |
|---|---|---|
| 未認証で要認証ページ | サインインへ誘導（callbackUrl 付き） | [protected-route.tsx](../../apps/web/src/components/system/protected-route.tsx) が `/auth/signin` へ redirect |
| 認証済みだが無効アカウント（`isActive=false`、防御的・通常到達せず） | 汎用エラーページで理由を説明 | `/auth/error?error=AccountDisabled` |
| 認証フロー上のエラー（OAuth 拒否・設定不備など） | 汎用エラーページ | `/auth/error?error=...` |
| リソース不在・閲覧者に出してはいけない非公開ルート（例: 他人の編集ページ） | 404 | `notFound()` → `not-found.tsx` |
| 取得時の予期せぬ例外 | 500 相当 | 各 `error.tsx`（reset 付き） |

- 専用の 403/`forbidden()`（Next の `authInterrupts` 実験 API）は採用しない（本番安定性優先・該当シナリオ不在）。
- エラー画面のデザインは同一系統（`Card` + suzuka/minase グラデーション）。`/auth/error` も `not-found.tsx`・各 `error.tsx` に揃える。
- 「閲覧は可能だが編集は不可」の非作成者アクセスは 403 ではなく `notFound()`（編集ルートを露出しない。作品・ボタン自体は詳細ページで閲覧可）。

## 同意管理・年齢認証ゲートの在処

- **Cookie 同意 / Google Consent Mode v2**: [components/consent/](../../apps/web/src/components/consent/)（バナー・設定パネル・Consent Mode スクリプト）。
  カスタムイベントは consent ゲート内で送る（GA4 の母数は同意率に依存。CLAUDE.md §1）。
- **年齢認証ゲート（R18 表示制御）**: 状態は [age-verification-context.tsx](../../apps/web/src/contexts/age-verification-context.tsx)
  （localStorage に保持・有効期限もここが正本）、UI は `components/consent/age-verification-overlay*.tsx`。

## Cloud Functions

スケジュールと書き込み先は [database-schema.md](database-schema.md) の「データ収集スケジュール」が索引
（cron の正本は Terraform の Cloud Scheduler）。`checkDataIntegrity` が非正規化を事後修復する点は CLAUDE.md §0 軸1・§2。
