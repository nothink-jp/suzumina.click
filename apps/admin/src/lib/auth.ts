import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

// 管理者Discord IDのリスト（環境変数から読み込み）
const ADMIN_DISCORD_IDS = process.env.ADMIN_DISCORD_IDS?.split(",").map((id) => id.trim()) || [];

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [
		Discord({
			clientId: process.env.DISCORD_CLIENT_ID || "",
			clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
		}),
	],

	callbacks: {
		async signIn({ user, account }) {
			// Discord認証のみ許可
			if (account?.provider !== "discord") {
				return false;
			}

			// 管理者IDリストに含まれているかチェック
			if (!user.id || !ADMIN_DISCORD_IDS.includes(user.id)) {
				console.warn(`Unauthorized admin access attempt by Discord ID: ${user.id}`);
				return false;
			}

			console.log(`Admin login successful: ${user.name} (${user.id})`);
			return true;
		},

		async session({ session, token }) {
			// セッションにDiscord IDを追加
			if (token.sub) {
				session.user.id = token.sub;
				session.user.isAdmin = ADMIN_DISCORD_IDS.includes(token.sub);
			}
			return session;
		},

		async jwt({ token, user }) {
			// JWTトークンにユーザー情報を保存
			if (user) {
				token.sub = user.id;
				token.isAdmin = ADMIN_DISCORD_IDS.includes(user.id);
			}
			return token;
		},
	},

	pages: {
		signIn: "/login",
		error: "/login",
	},

	session: {
		strategy: "jwt",
		maxAge: 24 * 60 * 60, // 24時間
	},

	debug: process.env.NODE_ENV === "development",
});
