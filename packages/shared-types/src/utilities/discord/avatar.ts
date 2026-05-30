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
