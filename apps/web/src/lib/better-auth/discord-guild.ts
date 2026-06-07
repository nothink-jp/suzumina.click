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
 * Discord API でユーザーの Guild メンバーシップを取得。
 * Bot Token を使わないため roles / nickname は取得しない。
 */
export async function fetchDiscordGuildMembership(
	accessToken: string,
	userId: string,
): Promise<GuildMembership | null> {
	try {
		const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!response.ok) return null;

		const guilds = (await response.json()) as Array<{ id: string; joined_at?: string }>;
		const suzuminaGuild = guilds.find((g) => g.id === SUZUMINA_GUILD_ID);

		if (!suzuminaGuild) {
			return { guildId: SUZUMINA_GUILD_ID, userId, isMember: false };
		}
		return {
			guildId: SUZUMINA_GUILD_ID,
			userId,
			isMember: true,
			roles: [],
			nickname: null,
			joinedAt: suzuminaGuild.joined_at || new Date().toISOString(),
		};
	} catch {
		return null;
	}
}
