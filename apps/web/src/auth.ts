import {
	type DiscordUser,
	type GuildMembership,
	isValidGuildMember,
	resolveDisplayName,
	SUZUMINA_GUILD_ID,
	type UserSession,
	UserSessionSchema,
} from "@suzumina.click/shared-types";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { getFirestore } from "@/lib/firestore";
import { createUser, updateLastLogin, userExists } from "@/lib/user-firestore";

/**
 * Discord画像URLからアバターハッシュを抽出するヘルパー関数
 */
function extractAvatarHash(imageUrl: string | null | undefined): string | null {
	if (!imageUrl) {
		return null;
	}
	const match = imageUrl.match(/\/avatars\/\d+\/([a-f0-9]+)\./);
	return match ? match[1] || null : null;
}

/**
 * DiscordUserオブジェクトを作成するヘルパー関数
 */
function createDiscordUserObject(
	providerAccountId: string,
	user: { name?: string | null; email?: string | null; image?: string | null },
): DiscordUser {
	return {
		id: providerAccountId,
		username: user.name || user.email?.split("@")[0] || "Unknown",
		globalName: user.name || undefined,
		avatar: extractAvatarHash(user.image),
		email: user.email || undefined,
		verified: true,
	};
}

/**
 * 新規Discordユーザーの処理を行うヘルパー関数
 */
async function handleNewDiscordUser(
	providerAccountId: string,
	user: {
		name?: string | null;
		email?: string | null;
		image?: string | null;
		guildMembership?: unknown;
	},
): Promise<void> {
	const alreadyExists = await userExists(providerAccountId);

	if (!alreadyExists) {
		try {
			const discordUser = createDiscordUserObject(providerAccountId, user);
			await createUser({
				discordUser,
				guildMembership: user.guildMembership as GuildMembership,
			});
		} catch (_error) {
			// ユーザー作成失敗時はログに記録（eventsは戻り値なし）
		}
	}
}

/**
 * Discord Guild情報を取得するヘルパー関数
 */
async function fetchDiscordGuildMembership(
	accessToken: string,
	userId: string,
): Promise<GuildMembership | null> {
	try {
		const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			return null;
		}

		const guilds = await response.json();
		const suzuminaGuild = guilds.find((guild: { id: string }) => guild.id === SUZUMINA_GUILD_ID);

		if (!suzuminaGuild) {
			return {
				guildId: SUZUMINA_GUILD_ID,
				userId,
				isMember: false,
			};
		}

		// より詳細なメンバー情報を取得（ニックネーム、ロールなど）
		// Note: Discord Bot Token が必要になるため、現在は基本情報のみ
		return {
			guildId: SUZUMINA_GUILD_ID,
			userId,
			isMember: true,
			roles: [], // Bot Token があれば取得可能
			nickname: null, // Bot Token があれば取得可能
			joinedAt: suzuminaGuild.joined_at || new Date().toISOString(),
		};
	} catch (_error) {
		return null;
	}
}

export const { handlers, auth, signIn, signOut } = NextAuth({
	// カスタムFirestore管理（アダプターなし）

	providers: [
		Discord({
			clientId: process.env.DISCORD_CLIENT_ID || "",
			clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
			// Guild情報取得のためのスコープを追加
			authorization: {
				params: {
					scope: "identify email guilds",
				},
			},
		}),
	],

	callbacks: {
		async signIn({ user, account }) {
			// Discord認証の場合のみGuild確認を実行
			if (account?.provider === "discord" && account.access_token && account.providerAccountId) {
				const guildMembership = await fetchDiscordGuildMembership(
					account.access_token,
					account.providerAccountId,
				);

				if (!guildMembership || !isValidGuildMember(guildMembership)) {
					return false; // ログイン拒否
				}

				// Guild情報をユーザープロファイルに保存（次のcallbackで使用）
				user.guildMembership = guildMembership;
			}

			return true;
		},

		jwt({ token, user, account }) {
			// 初回ログイン時にユーザー情報とGuild情報を保存
			if (user && account?.provider === "discord" && account.providerAccountId) {
				const discordUser = createDiscordUserObject(account.providerAccountId, user);

				const guildMembership = user.guildMembership as GuildMembership;

				token.discordUser = discordUser;
				token.guildMembership = guildMembership;
				token.displayName = resolveDisplayName(
					undefined, // displayNameは後でユーザーが設定
					discordUser.globalName,
					discordUser.username,
				);
			}

			return token;
		},

		async session({ session, token }) {
			const extendedToken = token as {
				discordUser?: DiscordUser;
				guildMembership?: GuildMembership;
				[key: string]: unknown;
			};
			if (
				extendedToken.discordUser &&
				extendedToken.guildMembership &&
				extendedToken.discordUser.id
			) {
				try {
					// Firestoreから最新のユーザー情報を取得
					const firestore = getFirestore();
					const userDoc = await firestore
						.collection("users")
						.doc(extendedToken.discordUser.id)
						.get();

					if (!userDoc.exists) {
						// セッションを無効化するため、userをundefinedに設定
						return { ...session, user: undefined };
					}

					const user = userDoc.data() as {
						isActive: boolean;
						discordId: string;
						username: string;
						globalName?: string;
						avatar?: string | null;
						displayName: string;
						role: "member" | "moderator" | "admin";
						[key: string]: unknown;
					};

					if (!user.isActive) {
						// セッションを無効化するため、userをundefinedに設定
						return { ...session, user: undefined };
					}

					// UserSessionスキーマに準拠したセッション情報を作成
					const userSession: UserSession = {
						discordId: user.discordId,
						username: user.username,
						globalName: user.globalName,
						avatar: user.avatar,
						displayName: user.displayName,
						role: user.role,
						guildMembership: extendedToken.guildMembership as GuildMembership,
						isActive: user.isActive,
					};

					// スキーマ検証
					const validatedUserSession = UserSessionSchema.parse(userSession);

					// ログイン時刻を更新（非同期、エラーは無視）
					// biome-ignore lint/suspicious/noConsole: NextAuth requires async error logging for user login tracking
					updateLastLogin(user.discordId).catch(console.error);

					return { ...session, user: validatedUserSession };
				} catch (_error) {
					// 検証失敗時はセッションを無効化
					return { ...session, user: undefined };
				}
			}

			return session;
		},
	},

	session: {
		strategy: "jwt", // JWTベースのセッション管理
	},

	pages: {
		signIn: "/auth/signin", // カスタムサインインページ
		error: "/auth/error", // エラーページ
	},

	events: {
		async signIn({ user, account }) {
			if (!account?.providerAccountId) {
				return;
			}

			// Discord認証での新規ユーザーの場合、Firestoreにユーザーデータを作成
			if (account?.provider === "discord" && user.guildMembership) {
				await handleNewDiscordUser(account.providerAccountId, user);
			}
		},

		signOut(params) {
			const _token = "token" in params ? params.token : null;
		},
	},

	debug: process.env.NODE_ENV === "development",
});

// TypeScript用の型定義拡張
declare module "next-auth" {
	interface User {
		guildMembership?: GuildMembership;
	}

	interface Session {
		user?: UserSession | undefined;
	}
}

// JWT type extensions removed to avoid module resolution errors
