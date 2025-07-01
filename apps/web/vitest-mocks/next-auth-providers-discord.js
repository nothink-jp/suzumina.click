export default function Discord() {
	return {
		id: "discord",
		name: "Discord",
		type: "oauth",
		authorization: "https://discord.com/api/oauth2/authorize",
		token: "https://discord.com/api/oauth2/token",
		userinfo: "https://discord.com/api/users/@me",
		profile: (profile) => ({
			id: profile.id,
			name: profile.username,
			email: profile.email,
			image: profile.avatar,
		}),
	};
}
