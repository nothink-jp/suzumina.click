/**
 * ローカル開発ログイン（Discord OAuth を通さずに better-auth の**実セッション**を発行する）の有効化ゲート。
 *
 * 認証の正本（better-auth / `getCurrentUser()` / `ProtectedRoute`）には分岐を一切入れていない。
 * `/api/dev/signin` が発行するのは better-auth 自身が作った本物のセッションで、以降の解決経路は
 * Discord ログインと完全に同一。この仕組みの有無で認証コードの振る舞いが変わることはない。
 *
 * **本番では構造的に無効**。次の 3 条件がすべて揃わない限り有効にならず、1 つでも欠ければ
 * ルートは 404 を返す（＝存在しないものとして振る舞う）。
 *
 * 1. `NODE_ENV !== "production"` — 本番ビルドでは無条件。opt-in フラグでも覆せず、
 *    `lib/firestore.ts` の `PLAYWRIGHT_EMULATOR` のような例外も**意図的に設けていない**
 * 2. `DEV_AUTH_BYPASS === "1"` — 明示 opt-in。`pnpm dev:local:auth` でのみ付き、`pnpm dev:local` では付かない
 * 3. `FIRESTORE_EMULATOR_HOST` が設定済 — Firestore が Emulator であることの要求。
 *    偽ユーザーの Server Action 書き込みが本番 Firestore に届く経路を塞ぐため、
 *    ADC 直結（`pnpm dev`）では 2 を付けても有効にならない
 */

/**
 * 開発用ユーザーの Discord ID（アプリ `users` コレクションの doc ID）。
 * 正本は `apps/functions/src/tools/firestore-local/fixtures/users.json` の doc ID で、**両者を一致させること**。
 * 実在しない形式（先頭 0 埋めの Snowflake）にして本物の Discord ID と衝突しないようにしてある。
 */
export const DEV_AUTH_DISCORD_ID = "000000000000000001";

/** better-auth 側 user（`ba_user`）の doc ID。固定値にして再ログインでも同じ行を使い回す（冪等）。 */
export const DEV_AUTH_BA_USER_ID = "dev-auth-user";

export const DEV_AUTH_NAME = "ローカル開発ユーザー";
export const DEV_AUTH_EMAIL = "dev-auth@localhost.invalid";

/**
 * ローカル開発ログインが有効か。上記 3 条件の AND。
 * 呼び出し側（`/api/dev/signin`）は false なら 404 を返す。
 */
export function isDevAuthEnabled(): boolean {
	if (process.env.NODE_ENV === "production") {
		return false;
	}
	if (process.env.DEV_AUTH_BYPASS !== "1") {
		return false;
	}
	return !!process.env.FIRESTORE_EMULATOR_HOST;
}
