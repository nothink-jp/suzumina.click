/**
 * サーバ側 認証抽象（SPR-157 Phase 2）
 *
 * NextAuth / better-auth どちらでも**同一の `UserSession`**（role/displayName/isFamilyMember/isActive を含む）を返す。
 * 呼び出し側はこの `getCurrentUser()` のみを使い、`@/auth`（NextAuth）や better-auth を直接参照しない。
 * 実体は `AUTH_PROVIDER` フラグで切替（遅延 import で未使用プロバイダを読み込まない）。
 * （このモジュールは next/headers・@/auth を動的 import するため実質サーバ専用。）
 */
import type { UserSession } from "@suzumina.click/shared-types";
import { AUTH_PROVIDER } from "./provider";

/**
 * 現在のログインユーザー（アプリの UserSession）を返す。未認証/無効ユーザーは null。
 */
export async function getCurrentUser(): Promise<UserSession | null> {
	if (AUTH_PROVIDER === "betterauth") {
		const [{ auth }, { headers }] = await Promise.all([
			import("@/lib/better-auth/auth"),
			import("next/headers"),
		]);
		const result = (await auth.api.getSession({ headers: await headers() })) as {
			appUser?: UserSession | null;
		} | null;
		return result?.appUser ?? null;
	}

	const { auth } = await import("@/auth");
	const session = await auth();
	return session?.user ?? null;
}

/**
 * Discord でサインイン。成功時は OAuth へリダイレクトする（redirect は例外として送出される）。
 */
export async function signInWithDiscord(callbackURL = "/"): Promise<void> {
	if (AUTH_PROVIDER === "betterauth") {
		const [{ auth }, { redirect }] = await Promise.all([
			import("@/lib/better-auth/auth"),
			import("next/navigation"),
		]);
		const res = await auth.api.signInSocial({ body: { provider: "discord", callbackURL } });
		if (res?.url) redirect(res.url);
		return;
	}
	const { signIn } = await import("@/auth");
	await signIn("discord", { redirectTo: callbackURL });
}

/**
 * 現在のセッションからサインアウトし、callbackURL へリダイレクトする。
 */
export async function signOutCurrent(callbackURL = "/"): Promise<void> {
	if (AUTH_PROVIDER === "betterauth") {
		const [{ auth }, { headers }, { redirect }] = await Promise.all([
			import("@/lib/better-auth/auth"),
			import("next/headers"),
			import("next/navigation"),
		]);
		await auth.api.signOut({ headers: await headers() });
		redirect(callbackURL);
		return;
	}
	const { signOut } = await import("@/auth");
	await signOut({ redirectTo: callbackURL });
}
