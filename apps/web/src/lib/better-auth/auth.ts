/**
 * better-auth インスタンス（本番唯一の認証）
 *
 * `/api/auth/*` にマウント。
 * - データ層: Firestore カスタムアダプタ（better-auth 標準モデルを `ba_*` コレクションに保存）
 * - アイデンティティと業務データの分離: displayName/isFamilyMember 等の正本は `users` コレクション。
 *   session enrich（`enrich-session.ts`）でそれを読み、セッションへ載せる。
 * - guild 日次同期は `guild-sync.ts`、初回ユーザー作成は `on-first-signup.ts` に分離。
 */
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins";
import { buildAppUserForSession } from "./enrich-session";
import { firestoreAdapter } from "./firestore-adapter";
import { createAppUserOnFirstSignup } from "./on-first-signup";

export const auth = betterAuth({
	appName: "suzumina.click",
	// env は BETTER_AUTH_*（Cloud Run が Secret Manager の BETTER_AUTH_SECRET から注入）。
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL,
	// 標準の /api/auth にマウント（Discord の既存 redirect URI をそのまま流用）。
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
				// 初回 Discord 連携時にアプリ users/{discordId} を自動作成する（詳細は on-first-signup.ts）。
				after: async (account) => {
					await createAppUserOnFirstSignup(account);
				},
			},
		},
	},

	plugins: [
		// クライアントへ返すセッションに appUser（アプリ UserSession）を付与（詳細は enrich-session.ts）。
		customSession(async ({ user, session }) => {
			const appUser = await buildAppUserForSession(user);
			return { user, session, appUser };
		}),
		// `auth.api.*`（server action / RSC からの直接呼び出し）が設定する Set-Cookie を
		// Next の cookies() に書き戻す。これが無いと signInSocial の OAuth state cookie が
		// ブラウザに届かず、コールバックで state_mismatch になる。**必ず最後のプラグイン**。
		nextCookies(),
	],
});

export type Auth = typeof auth;
