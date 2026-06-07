/**
 * サーバ側 認証抽象（SPR-158 Phase 3 / better-auth 唯一）
 *
 * 呼び出し側はこの `getCurrentUser()` のみを使い、better-auth を直接参照しない
 * （プロバイダ差し替えの局所化のため抽象は維持する）。
 * next/headers・better-auth を動的 import するため実質サーバ専用。
 */
import type { UserSession } from "@suzumina.click/shared-types";

/**
 * 現在のログインユーザー（アプリの UserSession）を返す。未認証/無効ユーザーは null。
 */
export async function getCurrentUser(): Promise<UserSession | null> {
	const [{ auth }, { headers }] = await Promise.all([
		import("@/lib/better-auth/auth"),
		import("next/headers"),
	]);
	const result = (await auth.api.getSession({ headers: await headers() })) as {
		appUser?: UserSession | null;
	} | null;
	return result?.appUser ?? null;
}

/**
 * Discord でサインイン。成功時は OAuth へリダイレクトする（redirect は例外として送出される）。
 */
export async function signInWithDiscord(callbackURL = "/"): Promise<void> {
	const [{ auth }, { redirect }] = await Promise.all([
		import("@/lib/better-auth/auth"),
		import("next/navigation"),
	]);
	const res = await auth.api.signInSocial({ body: { provider: "discord", callbackURL } });
	if (res?.url) redirect(res.url);
}

/**
 * 現在のセッションからサインアウトし、callbackURL へリダイレクトする。
 */
export async function signOutCurrent(callbackURL = "/"): Promise<void> {
	const [{ auth }, { headers }, { redirect }] = await Promise.all([
		import("@/lib/better-auth/auth"),
		import("next/headers"),
		import("next/navigation"),
	]);
	await auth.api.signOut({ headers: await headers() });
	redirect(callbackURL);
}
