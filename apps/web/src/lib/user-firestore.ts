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
import { getJSTDateString, isTodayJST } from "./jst-date";
import { error as logError, warn } from "./logger";
import { calculateDailyLimit } from "./rate-limit-utils";

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
		createdAt: data.createdAt,
		lastLoginAt: data.lastLoginAt,
		isPublicProfile: data.isPublicProfile,
		showStatistics: data.showStatistics,
		isActive: data.isActive,

		// 表示用の追加情報
		avatarUrl: createDiscordAvatarUrl(data.discordId, data.avatar),
		memberSince: formatMemberSince(data.createdAt),
		// lastLoginAt は JST 日次でしか更新されない（updateLastLogin 参照）ため、当日分は時間単位で出さない
		lastActiveText: isTodayJST(data.lastLoginAt) ? "今日" : formatRelativeTime(data.lastLoginAt),

		// ファミリーメンバーシップ状態
		isFamilyMember: data.flags?.isFamilyMember || false,
	};

	try {
		return FrontendUserSchema.parse(frontendData);
	} catch (error) {
		// ZodError を cause に残し、呼び出し側のログでどのフィールドが不一致か分かるようにする
		throw new Error("ユーザーデータの形式が無効です", { cause: error });
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
		// 呼び出し側へは汎用エラーに包んで投げ直すため、元のエラーは本番でもここで残す
		logError("getUserByDiscordId error:", { discordId, error });
		throw new Error("ユーザー情報の取得に失敗しました");
	}
}

/** gRPC ステータス ALREADY_EXISTS（`.create()` の対象ドキュメントが既にあるときに Firestore が返す） */
const FIRESTORE_ALREADY_EXISTS = 6;

/**
 * `users/{discordId}` が無ければ新規作成し `{ created: true }`、既にあれば何もせず `{ created: false }` を返す
 * （既存ドキュメントが正本・上書きしない）。
 * 存在判定は事前の読み取りではなく `.create()` の ALREADY_EXISTS で行うため、読み取りの失敗が
 * 「存在しない」と誤判定されて既存ユーザーを初期値で上書きすることは構造的に起きない（SPR-396）。
 * @throws ALREADY_EXISTS 以外の作成失敗（スキーマ検証・Firestore エラーは cause に残す）
 */
export async function createUserIfAbsent(input: CreateUserInput): Promise<{ created: boolean }> {
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

		// 既存ドキュメントがあれば ALREADY_EXISTS で失敗する（set と違い上書きしない）
		await firestore.collection("users").doc(input.discordUser.id).create(validatedData);
		return { created: true };
	} catch (error) {
		if ((error as { code?: unknown } | null)?.code === FIRESTORE_ALREADY_EXISTS) {
			return { created: false };
		}
		throw new Error("ユーザー作成に失敗しました", { cause: error });
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
	} catch (error) {
		throw new Error("ユーザー更新に失敗しました", { cause: error });
	}
}

/**
 * 最終ログイン時刻を更新（updatedAt も同時に動く）。
 * session enrich からは JST 日次 1 回に間引いて呼ばれる（`shouldUpdateLastLogin`）ため、
 * lastLoginAt は「JST でその日最初のセッション取得時刻」を表す。
 */
export async function updateLastLogin(discordId: string): Promise<void> {
	try {
		const firestore = getFirestore();
		const now = new Date().toISOString();

		await firestore.collection("users").doc(discordId).update({
			lastLoginAt: now,
			updatedAt: now,
		});
	} catch (error) {
		// ログイン時刻更新の失敗は致命的ではないため投げないが、本番でも観測できるよう warn に出す
		warn("updateLastLogin 失敗", { discordId, error });
	}
}
