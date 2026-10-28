/**
 * better-auth セッションへ載せる appUser（アプリ UserSession）の構築。
 *
 * better-auth の user/session は認証アイデンティティのみを持つ。role 廃止後も
 * displayName/isFamilyMember 等の正本は `users` コレクションにあり、ここで読んで載せる。
 * customSession プラグイン（auth.ts）から呼ばれる。
 */
import type { FirestoreUserData, UserSession } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import { warn } from "@/lib/logger";
import { isTodayJST } from "@/lib/rate-limit-utils";
import { updateLastLogin } from "@/lib/user-firestore";
import { refreshGuildStatusIfNeeded } from "./guild-sync";
import { buildUserSessionFromFirestore } from "./user-session";

/** better-auth が作成した user から Discord ID を取り出す（additionalField） */
function getDiscordId(user: unknown): string | undefined {
	const id = (user as { discordId?: unknown }).discordId;
	return typeof id === "string" && id.length > 0 ? id : undefined;
}

/**
 * lastLoginAt が JST で今日でなければ true（欠落・不正値も true）。
 * enrich はセッション取得のたび（cookieCache 切れ・client の get-session 含む）に走るため、
 * lastLogin の write を guild 同期と同じ日次 1 回に間引く判定。
 */
export function shouldUpdateLastLogin(lastLoginAt: string | undefined): boolean {
	return !isTodayJST(lastLoginAt);
}

/**
 * better-auth の user から アプリ UserSession を構築する。
 * null は「discordId なし / users 未作成 / 失敗」のときだけ。**isActive=false の無効ユーザーも返す**
 * （ブロック判定は呼び出し側の責務）。失敗は本番でも warn に出す（無音で未ログイン扱いにしない）。
 * 副作用: 日次 guild 同期（best-effort）と日次 lastLogin 更新（fire-and-forget）。
 */
export async function buildAppUserForSession(user: unknown): Promise<UserSession | null> {
	const discordId = getDiscordId(user);
	if (!discordId) return null;
	const rawId = (user as { id?: unknown }).id;
	const betterAuthUserId = typeof rawId === "string" ? rawId : "";
	try {
		const snap = await getFirestore().collection("users").doc(discordId).get();
		if (!snap.exists) return null;

		const userData = snap.data() as FirestoreUserData;
		const refreshed = await refreshGuildStatusIfNeeded(discordId, betterAuthUserId, userData);

		if (shouldUpdateLastLogin(userData.lastLoginAt)) updateLastLogin(discordId).catch(() => {});
		return buildUserSessionFromFirestore(refreshed);
	} catch (err) {
		warn("better-auth: customSession enrich 失敗（未ログイン扱いで返す）", {
			discordId,
			error: err,
		});
		return null;
	}
}
