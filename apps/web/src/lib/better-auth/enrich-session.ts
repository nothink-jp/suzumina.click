/**
 * better-auth セッションへ載せる appUser（アプリ UserSession）の構築。
 *
 * better-auth の user/session は認証アイデンティティのみを持つ。role 廃止後も
 * displayName/isFamilyMember 等の正本は `users` コレクションにあり、ここで読んで載せる。
 * customSession プラグイン（auth.ts）から呼ばれる。
 */
import type { UserSession } from "@suzumina.click/shared-types";
import type { FirestoreUserData } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import { error as logError } from "@/lib/logger";
import { updateLastLogin } from "@/lib/user-firestore";
import { refreshGuildStatusIfNeeded } from "./guild-sync";
import { buildUserSessionFromFirestore } from "./user-session";

const isDev = process.env.NODE_ENV !== "production";

/** better-auth が作成した user から Discord ID を取り出す（additionalField） */
function getDiscordId(user: unknown): string | undefined {
	const id = (user as { discordId?: unknown }).discordId;
	return typeof id === "string" && id.length > 0 ? id : undefined;
}

/**
 * better-auth の user から アプリ UserSession を構築する。未認証/未作成/失敗時は null。
 * 副作用: 日次 guild 同期（best-effort）と lastLogin 更新（fire-and-forget）。
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

		updateLastLogin(discordId).catch(() => {});
		return buildUserSessionFromFirestore(refreshed);
	} catch (err) {
		if (isDev) logError("better-auth: customSession enrich 失敗", { discordId, err });
		return null;
	}
}
