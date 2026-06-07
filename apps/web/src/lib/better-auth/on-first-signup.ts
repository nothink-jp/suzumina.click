/**
 * 初回 Discord 連携時にアプリ `users/{discordId}` を自動作成する。
 *
 * account フックは**新鮮なアクセストークン**を持つため、ここで guild を取得して
 * 初回から正しい isFamilyMember を反映する。既存ユーザー（正本 = 既存 users doc）は尊重する。
 * better-auth の databaseHooks.account.create.after（auth.ts）から呼ばれる。
 */
import { SUZUMINA_GUILD_ID } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import { error as logError } from "@/lib/logger";
import { createUser, userExists } from "@/lib/user-firestore";
import { extractAvatarHash, fetchDiscordGuildMembership } from "./discord-guild";

const isDev = process.env.NODE_ENV !== "production";

/** better-auth の account.create フックが渡す account のうち本処理で参照するフィールド。 */
interface FirstSignupAccount {
	providerId: string;
	accessToken?: string | null;
	accountId: string;
	userId: string;
}

export async function createAppUserOnFirstSignup(account: FirstSignupAccount): Promise<void> {
	if (account.providerId !== "discord" || !account.accessToken) return;
	const discordId = account.accountId;
	try {
		if (await userExists(discordId)) return;
		// プロフィール（name/email/image）は better-auth user 側にあるため読み出す
		const baUserSnap = await getFirestore().collection("ba_user").doc(account.userId).get();
		const bu = (baUserSnap.data() ?? {}) as {
			name?: string;
			email?: string;
			image?: string;
		};
		const guildMembership = (await fetchDiscordGuildMembership(account.accessToken, discordId)) ?? {
			guildId: SUZUMINA_GUILD_ID,
			userId: discordId,
			isMember: false,
		};
		await createUser({
			discordUser: {
				id: discordId,
				username: bu.name || bu.email?.split("@")[0] || "Unknown",
				globalName: bu.name || undefined,
				avatar: extractAvatarHash(bu.image),
				email: bu.email || undefined,
				verified: true,
			},
			guildMembership,
		});
	} catch (err) {
		if (isDev) logError("better-auth: app user 作成失敗", { discordId, err });
	}
}
