/**
 * better-auth セッションへ載せるアプリ固有 UserSession の組み立て（純粋関数 / SPR-156 Phase 1）
 *
 * better-auth の user/session は認証アイデンティティのみを持ち、displayName/isFamilyMember 等の
 * 正本は従来どおりアプリの `users` コレクション（FirestoreUserData）。ここはその変換層。
 * getCurrentUser 抽象（`src/lib/auth/server.ts`）が載せる UserSession の形に合わせる。
 */
import {
	type FirestoreUserData,
	type GuildMembership,
	type UserSession,
	UserSessionSchema,
} from "@suzumina.click/shared-types";

/**
 * FirestoreUserData から UserSession を構築・検証する。
 * @throws UserSessionSchema に適合しない場合（ZodError）
 */
export function buildUserSessionFromFirestore(
	userData: FirestoreUserData,
	guildMembership?: GuildMembership,
): UserSession {
	const session: UserSession = {
		discordId: userData.discordId,
		username: userData.username,
		globalName: userData.globalName,
		avatar: userData.avatar || undefined,
		displayName: userData.displayName,
		guildMembership,
		isActive: userData.isActive,
		isFamilyMember: userData.flags?.isFamilyMember || false,
	};
	return UserSessionSchema.parse(session);
}
