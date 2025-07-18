/**
 * ユーザー関連のFirestore操作を提供するモジュール
 */

import type { Query } from "@google-cloud/firestore";
import {
	type CreateUserInput,
	createDiscordAvatarUrl,
	type FirestoreUserData,
	FirestoreUserSchema,
	type FrontendUserData,
	FrontendUserSchema,
	formatMemberSince,
	formatRelativeTime,
	resolveDisplayName,
	type UpdateUserInput,
	type UserListResult,
	type UserQuery,
} from "@suzumina.click/shared-types";
import { getFirestore } from "./firestore";
import { error as logError } from "./logger";

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
		audioButtonsCount: data.audioButtonsCount,
		totalPlayCount: data.totalPlayCount,
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
 * Discord IDでユーザーを取得
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

		const userData: FirestoreUserData = {
			discordId: input.discordUser.id,
			username: input.discordUser.username,
			globalName: input.discordUser.globalName,
			avatar: input.discordUser.avatar,
			guildMembership: input.guildMembership,
			displayName,
			isActive: true,
			role: "member", // 新規ユーザーは全てmember権限から開始
			audioButtonsCount: 0,
			totalPlayCount: 0,
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
 * ユーザーの統計情報を更新 (Fire-and-Forget パターン)
 * revalidatePath を使用せず、バックグラウンドで非同期実行
 */
export async function updateUserStats(
	discordId: string,
	updates: {
		incrementAudioButtons?: boolean;
		incrementPlayCount?: number;
	},
): Promise<void> {
	try {
		const firestore = getFirestore();
		const now = new Date().toISOString();

		const updateData: Record<string, unknown> = {
			updatedAt: now,
		};

		if (updates.incrementAudioButtons) {
			// biome-ignore lint/suspicious/noExplicitAny: Firestore FieldValue typing limitation
			updateData.audioButtonsCount = (firestore as any).FieldValue.increment(1);
		}

		if (updates.incrementPlayCount && updates.incrementPlayCount > 0) {
			// biome-ignore lint/suspicious/noExplicitAny: Firestore FieldValue typing limitation
			updateData.totalPlayCount = (firestore as any).FieldValue.increment(
				updates.incrementPlayCount,
			);
		}

		// Fire-and-Forget: 統計更新はバックグラウンドで実行
		firestore
			.collection("users")
			.doc(discordId)
			.update(updateData)
			.catch((error) => {
				if (process.env.NODE_ENV === "development") {
					logError("ユーザー統計更新でエラー:", { discordId, updates, error });
				}
				// エラーは無視（Fire-and-Forget）
			});
	} catch (_error) {
		// 統計更新の失敗は致命的ではないため、エラーを投げない
	}
}

/**
 * ユーザーの統計情報を再計算（実際のデータから）
 */
export async function recalculateUserStats(discordId: string): Promise<void> {
	const firestore = getFirestore();

	// ユーザーの全音声ボタンを取得（公開・非公開含む）
	const audioButtonsSnapshot = await firestore
		.collection("audioButtons")
		.where("createdBy", "==", discordId)
		.get();

	const audioButtons = audioButtonsSnapshot.docs.map((doc) => doc.data());

	// 統計を計算
	const audioButtonsCount = audioButtons.length;
	const totalPlayCount = audioButtons.reduce((sum, button) => sum + (button.playCount || 0), 0);

	// ユーザー情報を更新
	await firestore.collection("users").doc(discordId).update({
		audioButtonsCount,
		totalPlayCount,
		updatedAt: new Date().toISOString(),
	});
}

/**
 * ユーザー一覧を取得（管理者用）
 */
export async function getUserList(query: UserQuery): Promise<UserListResult> {
	try {
		const firestore = getFirestore();
		let firestoreQuery: Query = firestore.collection("users");

		// 公開プロファイルのみのフィルター
		if (query.onlyPublic) {
			firestoreQuery = firestoreQuery.where("isPublicProfile", "==", true);
		}

		// ロールフィルター
		if (query.role) {
			firestoreQuery = firestoreQuery.where("role", "==", query.role);
		}

		// ソート設定
		switch (query.sortBy) {
			case "newest":
				firestoreQuery = firestoreQuery.orderBy("createdAt", "desc");
				break;
			case "oldest":
				firestoreQuery = firestoreQuery.orderBy("createdAt", "asc");
				break;
			case "mostActive":
				firestoreQuery = firestoreQuery.orderBy("lastLoginAt", "desc");
				break;
			case "alphabetical":
				firestoreQuery = firestoreQuery.orderBy("displayName", "asc");
				break;
			default:
				firestoreQuery = firestoreQuery.orderBy("createdAt", "desc");
		}

		// ページネーション
		if (query.startAfter) {
			const startAfterDoc = await firestore.collection("users").doc(query.startAfter).get();
			if (startAfterDoc.exists) {
				firestoreQuery = firestoreQuery.startAfter(startAfterDoc);
			}
		}

		firestoreQuery = firestoreQuery.limit(query.limit + 1); // +1 for hasMore check

		const snapshot = await firestoreQuery.get();
		const docs = snapshot.docs;

		const hasMore = docs.length > query.limit;
		const users = docs.slice(0, query.limit).map((doc) => {
			const userData = doc.data() as FirestoreUserData;
			return convertToFrontendUser(userData);
		});

		// テキスト検索（フロントエンド側でフィルタリング）
		let filteredUsers = users;
		if (query.searchText) {
			const searchTerms = query.searchText.toLowerCase().split(/\s+/);
			filteredUsers = users.filter((user) => {
				const searchableText = [user.username, user.globalName || "", user.displayName]
					.join(" ")
					.toLowerCase();

				return searchTerms.every((term) => searchableText.includes(term));
			});
		}

		return {
			users: filteredUsers,
			hasMore,
			lastUser: filteredUsers.length > 0 ? filteredUsers[filteredUsers.length - 1] : undefined,
		};
	} catch (_error) {
		throw new Error("ユーザー一覧の取得に失敗しました");
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
