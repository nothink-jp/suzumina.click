/**
 * ユーザー関連のFirestore操作を提供するモジュール
 */

import {
	type CreateUserInput,
	createDiscordAvatarUrl,
	type FirestoreUserData,
	FirestoreUserSchema,
	type FrontendUserData,
	FrontendUserSchema,
	formatMemberSince,
	formatRelativeTime,
	isValidGuildMember,
	resolveDisplayName,
	type UpdateUserInput,
} from "@suzumina.click/shared-types";
import { getFirestore } from "./firestore";
import { error as logError } from "./logger";
import { calculateDailyLimit, getJSTDateString } from "./rate-limit-utils";

/**
 * Firestoreユーザーデータをフロントエンド表示用に変換
 */
export function convertToFrontendUser(data: FirestoreUserData): FrontendUserData {
	const frontendData: FrontendUserData = {
		discordId: data.discordId,
		username: data.username,
		globalName: data.globalName,
		avatar: data.avatar,
		displayName: data.displayName,
		role: data.role,
		createdAt: data.createdAt,
		lastLoginAt: data.lastLoginAt,
		isPublicProfile: data.isPublicProfile,
		showStatistics: data.showStatistics,
		isActive: data.isActive,

		// 表示用の追加情報
		avatarUrl: createDiscordAvatarUrl(data.discordId, data.avatar),
		memberSince: formatMemberSince(data.createdAt),
		lastActiveText: formatRelativeTime(data.lastLoginAt),
	};

	try {
		return FrontendUserSchema.parse(frontendData);
	} catch (_error) {
		throw new Error("ユーザーデータの形式が無効です");
	}
}

/**
 * Discord IDでユーザーを取得（リアルタイム統計情報付き）
 */
export async function getUserByDiscordId(discordId: string): Promise<FrontendUserData | null> {
	try {
		const firestore = getFirestore();
		const userDoc = await firestore.collection("users").doc(discordId).get();

		if (!userDoc.exists) {
			return null;
		}

		const userData = userDoc.data() as FirestoreUserData;
		return convertToFrontendUser(userData);
	} catch (error) {
		// 開発環境でのみエラーログを出力
		if (process.env.NODE_ENV === "development") {
			logError("getUserByDiscordId error:", { discordId, error });
		}
		throw new Error("ユーザー情報の取得に失敗しました");
	}
}

/**
 * 新しいユーザーを作成
 */
export async function createUser(input: CreateUserInput): Promise<FrontendUserData> {
	try {
		const firestore = getFirestore();
		const now = new Date().toISOString();

		// 表示名の決定
		const displayName =
			input.displayName ||
			resolveDisplayName(undefined, input.discordUser.globalName, input.discordUser.username);

		// Guildメンバーシップの確認
		const isFamilyMember = input.guildMembership
			? isValidGuildMember(input.guildMembership)
			: false;
		const today = getJSTDateString();
		const dailyLimit = calculateDailyLimit({ isFamilyMember });

		const userData: FirestoreUserData = {
			discordId: input.discordUser.id,
			username: input.discordUser.username,
			globalName: input.discordUser.globalName,
			avatar: input.discordUser.avatar,
			guildMembership: input.guildMembership,
			displayName,
			isActive: true,
			role: "member", // 新規ユーザーは全てmember権限から開始
			flags: {
				isFamilyMember,
				lastGuildCheckDate: today,
			},
			dailyButtonLimit: {
				date: today,
				count: 0,
				limit: dailyLimit,
				guildChecked: true,
			},
			createdAt: now,
			updatedAt: now,
			lastLoginAt: now,
			isPublicProfile: true,
			showStatistics: true,
		};

		// スキーマ検証
		const validatedData = FirestoreUserSchema.parse(userData);

		// Firestoreに保存
		await firestore.collection("users").doc(input.discordUser.id).set(validatedData);
		return convertToFrontendUser(validatedData);
	} catch (_error) {
		throw new Error("ユーザー作成に失敗しました");
	}
}

/**
 * ユーザー情報を更新
 */
export async function updateUser(input: UpdateUserInput): Promise<FrontendUserData> {
	try {
		const firestore = getFirestore();
		const now = new Date().toISOString();

		const updateData: Partial<FirestoreUserData> = {
			updatedAt: now,
			...(input.displayName && { displayName: input.displayName }),
			...(input.isPublicProfile !== undefined && {
				isPublicProfile: input.isPublicProfile,
			}),
			...(input.showStatistics !== undefined && {
				showStatistics: input.showStatistics,
			}),
		};

		await firestore.collection("users").doc(input.discordId).update(updateData);

		// 更新後のデータを取得
		const updatedUser = await getUserByDiscordId(input.discordId);
		if (!updatedUser) {
			throw new Error("更新後のユーザーデータが見つかりません");
		}
		return updatedUser;
	} catch (_error) {
		throw new Error("ユーザー更新に失敗しました");
	}
}

/**
 * 最終ログイン時刻を更新
 */
export async function updateLastLogin(discordId: string): Promise<void> {
	try {
		const firestore = getFirestore();
		const now = new Date().toISOString();

		await firestore.collection("users").doc(discordId).update({
			lastLoginAt: now,
			updatedAt: now,
		});
	} catch (_error) {
		// ログイン時刻更新の失敗は致命的ではないため、エラーを投げない
	}
}

/**
 * ユーザーが存在するかチェック
 */
export async function userExists(discordId: string): Promise<boolean> {
	try {
		const firestore = getFirestore();
		const userDoc = await firestore.collection("users").doc(discordId).get();
		return userDoc.exists;
	} catch (_error) {
		return false;
	}
}
