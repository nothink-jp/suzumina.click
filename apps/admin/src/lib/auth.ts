import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

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

			// Discord IDを取得（providerAccountIdがDiscord ID）
			const discordId = account?.providerAccountId;
			if (!discordId) {
				// biome-ignore lint/suspicious/noConsole: Essential security logging for admin authentication
				console.warn("Discord ID not available");
				return false;
			}

			try {
				const { getFirestore } = await import("@/lib/firestore");
				const firestore = getFirestore();

				const userDoc = await firestore.collection("users").doc(discordId).get();

				if (!userDoc.exists) {
					// biome-ignore lint/suspicious/noConsole: Essential security logging for admin authentication
					console.warn(`User not found in Firestore: ${discordId}`);
					return false;
				}

				const userData = userDoc.data();

				// 管理者権限とアクティブ状態をチェック
				if (userData?.role !== "admin" || userData?.isActive !== true) {
					// biome-ignore lint/suspicious/noConsole: Essential security logging for admin authentication
					console.warn(
						`Unauthorized admin access attempt by Discord ID: ${discordId} (role: ${userData?.role}, active: ${userData?.isActive})`,
					);
					return false;
				}

				// biome-ignore lint/suspicious/noConsole: Essential security logging for admin authentication
				console.log(`Admin login successful: ${user.name} (${discordId})`);
				return true;
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Essential security logging for admin authentication
				console.error("Error checking admin status:", error);
				return false;
			}
		},

		async session({ session, token }) {
			// セッションにDiscord IDを追加
			if (token.sub && token.isAdmin) {
				session.user.id = token.sub;
				session.user.isAdmin = token.isAdmin as boolean;
			}
			return session;
		},

		async jwt({ token, user, account }) {
			// JWTトークンにユーザー情報を保存
			if (user && account?.provider === "discord") {
				token.sub = account.providerAccountId; // Discord IDを設定
				token.isAdmin = true; // Admin appアクセス時点で管理者権限確認済み
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

	// Trust the host since we're using NEXTAUTH_URL
	trustHost: true,

	debug: process.env.NODE_ENV === "development",
});
