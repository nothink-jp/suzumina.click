import type { DocumentReference } from "@google-cloud/firestore";
import {
	type DiscordUser,
	type GuildMembership,
	isValidGuildMember,
	resolveDisplayName,
	SUZUMINA_GUILD_ID,
	type UserSession,
	UserSessionSchema,
} from "@suzumina.click/shared-types";
import NextAuth, { type NextAuthResult } from "next-auth";
import Discord from "next-auth/providers/discord";
import { getFirestore } from "@/lib/firestore";
import { error as logError } from "@/lib/logger";
import { calculateDailyLimit, getJSTDateString, hasDateChangedJST } from "@/lib/rate-limit-utils";
import { createUser, updateLastLogin, userExists } from "@/lib/user-firestore";

/**
 * Firestore内のユーザーデータ型
 */
type FirestoreUserData = {
	isActive: boolean;
	discordId: string;
	username: string;
	globalName?: string;
	avatar?: string | null;
	displayName: string;
	role: "member" | "moderator" | "admin";
	flags?: {
		isFamilyMember?: boolean;
		lastGuildCheckDate?: string;
	};
	dailyButtonLimit?: {
		date: string;
		count: number;
		limit: number;
		guildChecked: boolean;
	};
	[key: string]: unknown;
};

/**
 * Discord画像URLからアバターハッシュを抽出
 */
function extractAvatarHash(imageUrl: string | null | undefined): string | null {
	if (!imageUrl) {
		return null;
	}
	const match = imageUrl.match(/\/avatars\/\d+\/([a-f0-9]+)\./);
	return match ? match[1] || null : null;
}

/**
 * DiscordUserオブジェクトを作成
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
 * 新規Discordユーザーの処理
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
 * Firestoreからユーザーロールを取得
 * @returns ユーザーロール（デフォルト: "member"）
 */
async function getUserRoleFromFirestore(discordId: string): Promise<string> {
	try {
		const firestore = getFirestore();
		const userDoc = await firestore.collection("users").doc(discordId).get();
		const userData = userDoc.data() as { role?: string } | undefined;
		return userData?.role || "member";
	} catch {
		return "member";
	}
}

/**
 * 日次Guildメンバーシップチェックと更新
 */
async function updateDailyGuildStatus(
	userRef: DocumentReference,
	userData: FirestoreUserData,
	accessToken: string,
	discordId: string,
): Promise<{ isFamilyMember: boolean; limit: number }> {
	const today = getJSTDateString();

	try {
		// Discord APIでGuild確認
		const guildMembership = await fetchDiscordGuildMembership(accessToken, discordId);
		const isFamilyMember = guildMembership ? isValidGuildMember(guildMembership) : false;
		const newLimit = calculateDailyLimit({ isFamilyMember });

		// Firestoreを更新（トランザクション使用）
		const firestore = getFirestore();
		await firestore.runTransaction(async (transaction) => {
			const freshUserDoc = await transaction.get(userRef);
			const freshData = freshUserDoc.data();

			// フラグとレート制限を更新
			const updates: Record<string, unknown> = {
				"flags.isFamilyMember": isFamilyMember,
				"flags.lastGuildCheckDate": today,
				"dailyButtonLimit.limit": newLimit,
				"dailyButtonLimit.guildChecked": true,
			};

			// 日付も変わっていたらカウントリセット
			if (freshData?.dailyButtonLimit?.date !== today) {
				updates["dailyButtonLimit.date"] = today;
				updates["dailyButtonLimit.count"] = 0;
			}

			transaction.update(userRef, updates);
		});

		return { isFamilyMember, limit: newLimit };
	} catch (error) {
		// Guildチェック失敗時は前回の値を使用
		if (process.env.NODE_ENV === "development") {
			logError("Guild check failed", { userId: discordId, error });
		}
		return {
			isFamilyMember: userData.flags?.isFamilyMember || false,
			limit: userData.dailyButtonLimit?.limit || 10,
		};
	}
}

/**
 * ユーザーセッション情報を構築
 */
function buildUserSession(
	userData: FirestoreUserData,
	guildMembership?: GuildMembership,
): UserSession {
	return {
		discordId: userData.discordId,
		username: userData.username,
		globalName: userData.globalName,
		avatar: userData.avatar || undefined,
		displayName: userData.displayName,
		role: userData.role,
		guildMembership,
		isActive: userData.isActive,
		isFamilyMember: userData.flags?.isFamilyMember || false,
	};
}

/**
 * Discord Guild情報を取得
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

/**
 * NextAuth.js設定
 *
 * @note 型推論の問題を回避するため、NextAuthResultで明示的に型付け
 * @note アダプターなし（カスタムFirestore管理）
 */
const nextAuth: NextAuthResult = NextAuth({
	trustHost: true,
	useSecureCookies: process.env.NODE_ENV === "production",

	providers: [
		Discord({
			clientId: process.env.DISCORD_CLIENT_ID || "",
			clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
			authorization: {
				params: {
					scope: "identify email guilds",
				},
			},
		}),
	],

	callbacks: {
		async signIn({ user, account, profile }) {
			if (account?.provider === "discord" && account.access_token && account.providerAccountId) {
				// セキュリティ検証: プロフィールIDとアカウントIDの一致確認
				if (!profile?.id || profile.id !== account.providerAccountId) {
					return false;
				}

				const guildMembership = await fetchDiscordGuildMembership(
					account.access_token,
					account.providerAccountId,
				);
				const isFamilyMember = guildMembership ? isValidGuildMember(guildMembership) : false;

				user.guildMembership = guildMembership || undefined;
				user.isFamilyMember = isFamilyMember;
			}

			return true;
		},

		async jwt({ token, user, account }) {
			if (user && account?.provider === "discord" && account.providerAccountId) {
				if (account.access_token) {
					token.accessToken = account.access_token;
				}
				const discordUser = createDiscordUserObject(account.providerAccountId, user);
				const guildMembership = user.guildMembership as GuildMembership;

				token.discordUser = discordUser;
				token.guildMembership = guildMembership;
				token.isFamilyMember = user.isFamilyMember;
				token.displayName = resolveDisplayName(
					undefined,
					discordUser.globalName,
					discordUser.username,
				);
				token.role = await getUserRoleFromFirestore(discordUser.id);
			}

			return token;
		},

		async session({ session, token }) {
			const extendedToken = token as {
				discordUser?: DiscordUser;
				guildMembership?: GuildMembership;
				accessToken?: string;
				isFamilyMember?: boolean;
				[key: string]: unknown;
			};

			if (!extendedToken.discordUser?.id) {
				return session;
			}

			try {
				const firestore = getFirestore();
				const userRef = firestore.collection("users").doc(extendedToken.discordUser.id);
				const userDoc = await userRef.get();

				if (!userDoc.exists) {
					return { ...session, user: undefined };
				}

				const userData = userDoc.data() as FirestoreUserData;
				if (!userData?.isActive) {
					return { ...session, user: undefined };
				}

				if (hasDateChangedJST(userData.flags?.lastGuildCheckDate) && extendedToken.accessToken) {
					const guildStatus = await updateDailyGuildStatus(
						userRef,
						userData,
						extendedToken.accessToken,
						extendedToken.discordUser.id,
					);

					if (!userData.flags) userData.flags = {};
					userData.flags.isFamilyMember = guildStatus.isFamilyMember;
					if (userData.dailyButtonLimit) {
						userData.dailyButtonLimit.limit = guildStatus.limit;
					}
				}

				const userSession = buildUserSession(userData, extendedToken.guildMembership);
				const validatedUserSession = UserSessionSchema.parse(userSession);

				updateLastLogin(userData.discordId).catch((error) => {
					if (process.env.NODE_ENV === "development") {
						logError("updateLastLogin error:", error);
					}
				});

				return { ...session, user: validatedUserSession };
			} catch (_error) {
				return { ...session, user: undefined };
			}
		},
	},

	session: {
		strategy: "jwt",
	},

	pages: {
		signIn: "/auth/signin",
		error: "/auth/error",
	},

	events: {
		async signIn({ user, account }) {
			if (!account?.providerAccountId || account?.provider !== "discord") {
				return;
			}
			await handleNewDiscordUser(account.providerAccountId, user);
		},
	},

	debug: process.env.NODE_ENV === "development",
});

/**
 * NextAuth.jsのエクスポート
 *
 * 注意: signInのみ明示的な型注釈を使用しています。
 * 理由: signIn関数の複雑なジェネリック型（ProviderId）が内部パッケージ（@auth/core/providers）
 * への参照を含むため、TypeScript 2742エラー（型の移植性問題）が発生します。
 * NextAuthResult["signIn"]で明示的に型付けすることで、型情報を保持しつつエラーを回避。
 *
 * @see https://authjs.dev/getting-started/installation
 */
export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn;
export const signOut = nextAuth.signOut;

declare module "next-auth" {
	interface User {
		guildMembership?: GuildMembership;
		isFamilyMember?: boolean;
	}

	interface Session {
		user?: UserSession | undefined;
	}
}
