/**
 * Discord Guild / プロフィール関連ヘルパー（better-auth 用）
 */
import { type GuildMembership, SUZUMINA_GUILD_ID } from "@suzumina.click/shared-types";

/** Discord 画像 URL からアバターハッシュを抽出 */
export function extractAvatarHash(imageUrl: string | null | undefined): string | null {
	if (!imageUrl) return null;
	const match = imageUrl.match(/\/avatars\/\d+\/([a-f0-9]+)\./);
	return match ? match[1] || null : null;
}

/**
 * Guild メンバーシップ取得の結果。失敗は「非メンバー確定」と区別するため membership を持たない。
 * `status` は HTTP 応答があった失敗（401=トークン無効 / 429・5xx=一時障害）、`error` は通信・パースの例外。
 */
export type GuildMembershipFetchResult =
	| { ok: true; membership: GuildMembership }
	| { ok: false; status?: number; error?: unknown };

/**
 * Discord API でユーザーの Guild メンバーシップを取得。
 * Bot Token を使わないため roles / nickname は取得しない。失敗は throw せず `ok: false` で返す。
 */
export async function fetchDiscordGuildMembership(
	accessToken: string,
	userId: string,
): Promise<GuildMembershipFetchResult> {
	try {
		const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!response.ok) return { ok: false, status: response.status };

		const guilds = (await response.json()) as Array<{ id: string; joined_at?: string }>;
		const suzuminaGuild = guilds.find((g) => g.id === SUZUMINA_GUILD_ID);

		if (!suzuminaGuild) {
			return { ok: true, membership: { guildId: SUZUMINA_GUILD_ID, userId, isMember: false } };
		}
		return {
			ok: true,
			membership: {
				guildId: SUZUMINA_GUILD_ID,
				userId,
				isMember: true,
				roles: [],
				nickname: null,
				joinedAt: suzuminaGuild.joined_at || new Date().toISOString(),
			},
		};
	} catch (error) {
		return { ok: false, error };
	}
}
