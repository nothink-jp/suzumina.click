/**
 * better-auth インスタンス（SPR-158 Phase 3 / 本番唯一の認証）
 *
 * NextAuth を撤去し、本アプリ唯一の認証実装。`/api/auth/*` にマウント。
 * - データ層: Firestore カスタムアダプタ（better-auth 標準モデルを `ba_*` コレクションに保存）
 * - アイデンティティと業務データの分離: role/displayName/isFamilyMember の正本は `users` コレクション。
 *   customSession でそれを読み、セッションへ載せる。
 */
import {
	type FirestoreUserData,
	isValidGuildMember,
	SUZUMINA_GUILD_ID,
} from "@suzumina.click/shared-types";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins";
import { getFirestore } from "@/lib/firestore";
import { error as logError } from "@/lib/logger";
import { calculateDailyLimit, getJSTDateString, hasDateChangedJST } from "@/lib/rate-limit-utils";
import { createUser, updateLastLogin, userExists } from "@/lib/user-firestore";
import { extractAvatarHash, fetchDiscordGuildMembership } from "./discord-guild";
import { firestoreAdapter, firestoreOps } from "./firestore-adapter";
import { buildUserSessionFromFirestore } from "./user-session";

const isDev = process.env.NODE_ENV !== "production";

// better-auth の標準モデル(account 等)へのアクセスはアダプタ境界(firestoreOps)を共有する。
// 直接 getFirestore().collection("ba_account") を叩くと Cloud SQL 差し替え時の局所性が崩れるため。
const ops = firestoreOps();

/** better-auth が作成した user から Discord ID を取り出す（additionalField） */
function getDiscordId(user: unknown): string | undefined {
	const id = (user as { discordId?: unknown }).discordId;
	return typeof id === "string" && id.length > 0 ? id : undefined;
}

/** account モデルから Discord アクセストークンを取得（日次 guild チェック用・best-effort / アダプタ経由） */
async function getDiscordAccessToken(betterAuthUserId: string): Promise<string | undefined> {
	try {
		const accounts = await ops.findMany({
			model: "account",
			where: [{ field: "userId", value: betterAuthUserId, operator: "eq", connector: "AND" }],
		});
		for (const acc of accounts) {
			const providerId = acc.providerId as string | undefined;
			const accessToken = acc.accessToken as string | undefined;
			if (providerId === "discord" && accessToken) return accessToken;
		}
	} catch {
		// トークン取得失敗時は日次チェックを諦め、前回値を使う
	}
	return undefined;
}

/**
 * 日次 guild チェック（best-effort）。成功時のみ users の flags / dailyButtonLimit を更新し、
 * **更新後の値を返す**（引数は変異しない）。失敗時・対象日でない場合は受け取った userData をそのまま返す。
 */
async function refreshGuildStatusIfNeeded(
	discordId: string,
	betterAuthUserId: string,
	userData: FirestoreUserData,
): Promise<FirestoreUserData> {
	if (!hasDateChangedJST(userData.flags?.lastGuildCheckDate)) return userData;
	const token = await getDiscordAccessToken(betterAuthUserId);
	if (!token) return userData;
	try {
		const guildMembership = await fetchDiscordGuildMembership(token, discordId);
		const isFamilyMember = guildMembership ? isValidGuildMember(guildMembership) : false;
		const today = getJSTDateString();
		const newLimit = calculateDailyLimit({ isFamilyMember });
		// 日付が変わっていればカウントをリセット
		const dateChanged = userData.dailyButtonLimit?.date !== today;
		await getFirestore()
			.collection("users")
			.doc(discordId)
			.update({
				"flags.isFamilyMember": isFamilyMember,
				"flags.lastGuildCheckDate": today,
				"dailyButtonLimit.limit": newLimit,
				"dailyButtonLimit.guildChecked": true,
				...(dateChanged ? { "dailyButtonLimit.date": today, "dailyButtonLimit.count": 0 } : {}),
			});
		// 変異せず更新後のコピーを返す
		return {
			...userData,
			flags: { ...userData.flags, isFamilyMember, lastGuildCheckDate: today },
			dailyButtonLimit: userData.dailyButtonLimit
				? {
						...userData.dailyButtonLimit,
						limit: newLimit,
						guildChecked: true,
						...(dateChanged ? { date: today, count: 0 } : {}),
					}
				: userData.dailyButtonLimit,
		};
	} catch (err) {
		if (isDev) logError("better-auth: guild check failed", { discordId, err });
		return userData;
	}
}

export const auth = betterAuth({
	appName: "suzumina.click",
	// env は BETTER_AUTH_*（Cloud Run が Secret Manager の BETTER_AUTH_SECRET から注入）。
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL,
	// NextAuth 撤去後は標準の /api/auth を使用（Discord の既存 redirect URI をそのまま流用）。
	basePath: "/api/auth",
	database: firestoreAdapter({ debugLogs: false }),

	user: {
		additionalFields: {
			// Discord ユーザー ID（アプリ `users` ドキュメント ID と一致）。API 入力では設定不可。
			discordId: { type: "string", required: false, input: false },
		},
	},

	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 日
		updateAge: 60 * 60 * 24, // 1 日
		cookieCache: { enabled: true, maxAge: 5 * 60 },
	},

	socialProviders: {
		discord: {
			clientId: process.env.DISCORD_CLIENT_ID || "",
			clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
			scope: ["identify", "email", "guilds"],
			mapProfileToUser: (profile) => ({ discordId: profile.id }),
		},
	},

	databaseHooks: {
		account: {
			create: {
				// 初回 Discord 連携時にアプリ `users/{discordId}` を自動作成する。
				// account フックは**新鮮なアクセストークン**を持つため、ここで guild を取得して
				// 初回から正しい isFamilyMember を反映する（NextAuth の signIn callback 相当）。
				// 既存ユーザー（role 等の正本 = 既存 users doc）はそのまま尊重する。
				after: async (account) => {
					if (account.providerId !== "discord" || !account.accessToken) return;
					const discordId = account.accountId;
					try {
						if (await userExists(discordId)) return;
						// プロフィール（name/email/image）は better-auth user 側にあるため読み出す
						const baUserSnap = await getFirestore().collection("ba_user").doc(account.userId).get();
						const bu = (baUserSnap.data() ?? {}) as {
							name?: string;
							email?: string;
							image?: string;
						};
						const guildMembership = (await fetchDiscordGuildMembership(
							account.accessToken,
							discordId,
						)) ?? { guildId: SUZUMINA_GUILD_ID, userId: discordId, isMember: false };
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
						if (isDev) logError("better-auth: app user 作成失敗", { discordId, err });
					}
				},
			},
		},
	},

	plugins: [
		// クライアントへ返すセッションに displayName/isFamilyMember 等のアプリ情報を付与
		customSession(async ({ user, session }) => {
			const discordId = getDiscordId(user);
			if (!discordId) return { user, session, appUser: null };
			try {
				const ref = getFirestore().collection("users").doc(discordId);
				const snap = await ref.get();
				if (!snap.exists) return { user, session, appUser: null };

				const userData = snap.data() as FirestoreUserData;
				const refreshed = await refreshGuildStatusIfNeeded(discordId, user.id, userData);

				updateLastLogin(discordId).catch(() => {});
				const appUser = buildUserSessionFromFirestore(refreshed);
				return { user, session, appUser };
			} catch (err) {
				if (isDev) logError("better-auth: customSession enrich 失敗", { discordId, err });
				return { user, session, appUser: null };
			}
		}),
		// `auth.api.*`（server action / RSC からの直接呼び出し）が設定する Set-Cookie を
		// Next の cookies() に書き戻す。これが無いと signInSocial の OAuth state cookie が
		// ブラウザに届かず、コールバックで state_mismatch になる。**必ず最後のプラグイン**。
		nextCookies(),
	],
});

export type Auth = typeof auth;
