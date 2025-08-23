import { z } from "zod";

/**
 * Discord OAuth認証情報のスキーマ
 */
export const DiscordUserSchema = z.object({
	id: z.string().min(1, {
		message: "Discord User IDは必須です",
	}),
	username: z.string().min(1, {
		message: "Discord Usernameは必須です",
	}),
	discriminator: z.string().optional(), // 新しいDiscordでは廃止予定
	globalName: z.string().optional(), // 新しいDisplay Name
	avatar: z.string().nullable().optional(),
	email: z.string().email().optional(), // OAuth scope次第
	verified: z.boolean().optional(),
});

/**
 * Discord Guild情報のスキーマ
 */
export const DiscordGuildSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	icon: z.string().nullable().optional(),
	owner: z.boolean().optional(),
	permissions: z.string().optional(),
});

/**
 * Guild所属確認のスキーマ
 */
export const GuildMembershipSchema = z.object({
	guildId: z.string().min(1),
	userId: z.string().min(1),
	isMember: z.boolean(),
	roles: z.array(z.string()).optional(),
	nickname: z.string().nullable().optional(),
	joinedAt: z.string().datetime().optional(),
});

/**
 * 対象Guildの設定
 */
export const SUZUMINA_GUILD_ID = "959095494456537158";

/**
 * Firestoreに保存するユーザーデータのスキーマ
 */
export const FirestoreUserSchema = z.object({
	// Discord基本情報
	discordId: z.string().min(1, {
		message: "Discord IDは必須です",
	}),
	username: z.string().min(1, {
		message: "Usernameは必須です",
	}),
	globalName: z.string().optional(),
	avatar: z.string().nullable().optional(),

	// Guild確認情報
	guildMembership: GuildMembershipSchema,

	// アプリ内ユーザー情報
	displayName: z.string().min(1).max(50, {
		message: "表示名は50文字以下である必要があります",
	}),
	isActive: z.boolean().default(true),

	// 権限・ロール
	role: z.enum(["member", "moderator", "admin"]).default("member"),

	// ユーザーフラグ（権限管理用）
	flags: z
		.object({
			isFamilyMember: z.boolean().default(false),
			lastGuildCheckDate: z.string().optional(), // YYYY-MM-DD形式
		})
		.optional(),

	// レート制限
	dailyButtonLimit: z
		.object({
			date: z.string(), // YYYY-MM-DD形式（JST）
			count: z.number().int().min(0).default(0),
			limit: z.number().int().min(0).default(10),
			guildChecked: z.boolean().default(false),
		})
		.optional(),

	// 管理情報
	createdAt: z.string().datetime({
		message: "作成日時はISO形式の日時である必要があります",
	}),
	updatedAt: z.string().datetime({
		message: "更新日時はISO形式の日時である必要があります",
	}),
	lastLoginAt: z.string().datetime({
		message: "最終ログイン日時はISO形式の日時である必要があります",
	}),

	// プライバシー設定
	isPublicProfile: z.boolean().default(true),
	showStatistics: z.boolean().default(true),
});

/**
 * フロントエンド表示用のユーザーデータスキーマ
 */
export const FrontendUserSchema = z.object({
	discordId: z.string(),
	username: z.string(),
	globalName: z.string().optional(),
	avatar: z.string().nullable().optional(),
	displayName: z.string(),
	role: z.enum(["member", "moderator", "admin"]),

	// 表示用日時
	createdAt: z.string().datetime(),
	lastLoginAt: z.string().datetime(),

	// プライバシー設定に応じた表示制御
	isPublicProfile: z.boolean(),
	showStatistics: z.boolean(),
	isActive: z.boolean(),

	// 表示用の追加情報
	avatarUrl: z.string().url().optional(),
	memberSince: z.string(), // "2024年1月から" のような表示用テキスト
	lastActiveText: z.string(), // "3日前" のような表示用テキスト

	// ファミリーメンバーシップ状態
	isFamilyMember: z.boolean().optional(),
});

/**
 * ユーザー認証セッション情報のスキーマ
 */
export const UserSessionSchema = z.object({
	discordId: z.string(),
	username: z.string(),
	globalName: z.string().optional(),
	avatar: z.string().nullable().optional(),
	displayName: z.string(),
	role: z.enum(["member", "moderator", "admin"]),
	guildMembership: GuildMembershipSchema.optional(), // 一般ユーザーはGuildメンバーでない可能性
	isActive: z.boolean(),
	isFamilyMember: z.boolean().optional(), // セッションにフラグ情報を追加
});

/**
 * ユーザー作成・更新時の入力データスキーマ
 */
export const CreateUserInputSchema = z.object({
	discordUser: DiscordUserSchema,
	guildMembership: GuildMembershipSchema,
	displayName: z.string().min(1).max(50).optional(), // 未指定の場合はglobalName or usernameを使用
});

export const UpdateUserInputSchema = z.object({
	discordId: z.string().min(1),
	displayName: z.string().min(1).max(50).optional(),
	isPublicProfile: z.boolean().optional(),
	showStatistics: z.boolean().optional(),
});

/**
 * ユーザー検索・フィルター用のクエリスキーマ
 */
export const UserQuerySchema = z.object({
	limit: z.number().int().positive().max(50).default(20),
	startAfter: z.string().optional(),
	role: z.enum(["member", "moderator", "admin"]).optional(),
	searchText: z.string().max(50).optional(), // username, globalName, displayNameで検索
	sortBy: z.enum(["newest", "oldest", "mostActive", "alphabetical"]).default("newest"),
	onlyPublic: z.boolean().default(true),
});

/**
 * ユーザーリスト結果のスキーマ
 */
export const UserListResultSchema = z.object({
	users: z.array(FrontendUserSchema),
	hasMore: z.boolean(),
	lastUser: FrontendUserSchema.optional(),
	totalCount: z.number().int().min(0).optional(),
});

// 型定義のエクスポート
export type DiscordUser = z.infer<typeof DiscordUserSchema>;
export type DiscordGuild = z.infer<typeof DiscordGuildSchema>;
export type GuildMembership = z.infer<typeof GuildMembershipSchema>;
export type FirestoreUserData = z.infer<typeof FirestoreUserSchema>;
export type FrontendUserData = z.infer<typeof FrontendUserSchema>;
export type UserSession = z.infer<typeof UserSessionSchema>;
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type UserListResult = z.infer<typeof UserListResultSchema>;

// ユーザーフラグの型定義
export type UserFlags = {
	isFamilyMember: boolean;
	lastGuildCheckDate?: string;
};

// レート制限の型定義
export type DailyButtonLimit = {
	date: string;
	count: number;
	limit: number;
	guildChecked: boolean;
};

/**
 * ユーザーロール表示名を取得するヘルパー関数
 */
export function getUserRoleLabel(role: "member" | "moderator" | "admin"): string {
	const labels = {
		member: "メンバー",
		moderator: "モデレーター",
		admin: "管理者",
	};
	return labels[role];
}

/**
 * Discord アバターURLを生成するヘルパー関数
 */
export function createDiscordAvatarUrl(
	userId: string,
	avatarHash: string | null | undefined,
	size = 128,
): string {
	// ユーザーIDの検証
	if (!userId || typeof userId !== "string") {
		return "https://cdn.discordapp.com/embed/avatars/0.png";
	}

	if (!avatarHash) {
		// デフォルトアバター (ユーザーIDベース)
		const defaultAvatarIndex = Number.parseInt(userId, 10) % 5;
		return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
	}

	// カスタムアバター
	const extension = avatarHash.startsWith("a_") ? "gif" : "png";
	return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
}

/**
 * 表示名を決定するヘルパー関数
 */
export function resolveDisplayName(
	displayName: string | undefined,
	globalName: string | undefined,
	username: string,
): string {
	return displayName || globalName || username;
}

/**
 * Guild所属確認のヘルパー関数
 */
export function isValidGuildMember(guildMembership: GuildMembership): boolean {
	return guildMembership.guildId === SUZUMINA_GUILD_ID && guildMembership.isMember;
}

/**
 * 相対時間表示のヘルパー関数
 */
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

/**
 * メンバー期間表示のヘルパー関数
 */
export function formatMemberSince(dateString: string): string {
	const date = new Date(dateString);
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	return `${year}年${month}月から`;
}
