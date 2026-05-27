import type { GuildMembership } from "../entities/user";

export const SUZUMINA_GUILD_ID = "959095494456537158";

export function getUserRoleLabel(role: "member" | "moderator" | "admin"): string {
	const labels = {
		member: "メンバー",
		moderator: "モデレーター",
		admin: "管理者",
	};
	return labels[role];
}

export function createDiscordAvatarUrl(
	userId: string,
	avatarHash: string | null | undefined,
	size = 128,
): string {
	if (!userId || typeof userId !== "string") {
		return "https://cdn.discordapp.com/embed/avatars/0.png";
	}

	if (!avatarHash) {
		const defaultAvatarIndex = Number.parseInt(userId, 10) % 5;
		return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
	}

	const extension = avatarHash.startsWith("a_") ? "gif" : "png";
	return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
}

export function resolveDisplayName(
	displayName: string | undefined,
	globalName: string | undefined,
	username: string,
): string {
	return displayName || globalName || username;
}

export function isValidGuildMember(guildMembership: GuildMembership): boolean {
	return guildMembership.guildId === SUZUMINA_GUILD_ID && guildMembership.isMember;
}

export function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		if (diffHours === 0) {
			const diffMinutes = Math.floor(diffMs / (1000 * 60));
			return diffMinutes <= 1 ? "たった今" : `${diffMinutes}分前`;
		}
		return `${diffHours}時間前`;
	}
	if (diffDays === 1) {
		return "昨日";
	}
	if (diffDays < 7) {
		return `${diffDays}日前`;
	}
	if (diffDays < 30) {
		const diffWeeks = Math.floor(diffDays / 7);
		return `${diffWeeks}週間前`;
	}
	if (diffDays < 365) {
		const diffMonths = Math.floor(diffDays / 30);
		return `${diffMonths}ヶ月前`;
	}
	const diffYears = Math.floor(diffDays / 365);
	return `${diffYears}年前`;
}

export function formatMemberSince(dateString: string): string {
	const date = new Date(dateString);
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	return `${year}年${month}月から`;
}
