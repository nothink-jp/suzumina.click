/**
 * 初回 Discord 連携時にアプリ `users/{discordId}` を自動作成する。
 *
 * account フックは**新鮮なアクセストークン**を持つため、ここで guild を取得して
 * 初回から正しい isFamilyMember を反映する。既存ユーザー（正本 = 既存 users doc）は尊重する。
 * better-auth の databaseHooks.account.create.after（auth.ts）から呼ばれる。
 */
import { SUZUMINA_GUILD_ID } from "@suzumina.click/shared-types";
import { error as logError } from "@/lib/logger";
import { createUser, userExists } from "@/lib/user-firestore";
import { extractAvatarHash, fetchDiscordGuildMembership } from "./discord-guild";
import { type FirestoreOps, firestoreOps } from "./firestore-adapter";

// better-auth 標準モデル(user 等)へのアクセスはアダプタ境界(firestoreOps)を共有する。
const ops = firestoreOps();

/** better-auth の account.create フックが渡す account のうち本処理で参照するフィールド。 */
interface FirstSignupAccount {
	providerId: string;
	accessToken?: string | null;
	accountId: string;
	userId: string;
}

/**
 * better-auth user の `discordId`（additionalField / input:false）を server 側で充填する。
 *
 * better-auth 1.6.21+ は OAuth profile sync で input:false のフィールドへの provider 値を無視するため、
 * `mapProfileToUser` では埋められない。account.create フックで account.accountId（= Discord user id）から
 * 明示セットする。これが無いと enrich-session が discordId 無しで appUser を null にし、新規ユーザーが認証不能になる。
 * best-effort（失敗してもサインアップ自体は止めない）。テスト用に ops を注入可能。
 */
export async function provisionDiscordIdOnAuthUser(
	account: Pick<FirstSignupAccount, "providerId" | "accountId" | "userId">,
	opsImpl: Pick<FirestoreOps, "update"> = ops,
): Promise<void> {
	if (account.providerId !== "discord" || !account.accountId || !account.userId) return;
	try {
		await opsImpl.update({
			model: "user",
			where: [{ field: "id", value: account.userId, operator: "eq", connector: "AND" }],
			update: { discordId: account.accountId },
		});
	} catch (err) {
		// 認証クリティカル: 失敗すると enrich-session が appUser を null にし新規ユーザーが認証不能になる。
		// best-effort でサインアップは止めないが、本番でも観測可能にするため常にエラーログを残す。
		logError("better-auth: discordId provisioning 失敗", { discordId: account.accountId, err });
	}
}

export async function createAppUserOnFirstSignup(account: FirstSignupAccount): Promise<void> {
	if (account.providerId !== "discord" || !account.accessToken) return;
	const discordId = account.accountId;
	try {
		if (await userExists(discordId)) return;
		// プロフィール（name/email/image）は better-auth user 側にあるため読み出す（アダプタ経由）
		const baUser = await ops.findOne({
			model: "user",
			where: [{ field: "id", value: account.userId, operator: "eq", connector: "AND" }],
		});
		const bu = (baUser ?? {}) as {
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
		// discordId provisioning と同じく認証クリティカル（users/{discordId} 不在も appUser を null にする）。
		// 本番でも検知できるよう常にエラーログを残す。
		logError("better-auth: app user 作成失敗", { discordId, err });
	}
}
