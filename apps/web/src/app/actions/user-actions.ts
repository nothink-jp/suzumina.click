"use server";

import { FieldValue } from "@google-cloud/firestore";
import {
	createDiscordAvatarUrl,
	type FirestoreUserData,
	type FrontendUserData,
	formatMemberSince,
	formatRelativeTime,
	type UpdateUserInput,
	UpdateUserInputSchema,
	type UserListResult,
	type UserQuery,
	UserQuerySchema,
} from "@suzumina.click/shared-types";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/components/system/protected-route";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

// ヘルパー関数：ユーザー更新の認証チェック
async function validateUserUpdateAuth(
	userId: string,
	currentUser: { role: string; discordId: string },
): Promise<{ success: true } | { success: false; error: string }> {
	if (currentUser.role !== "admin") {
		logger.warn("管理者権限が必要", { userId: currentUser.discordId, targetUserId: userId });
		return { success: false as const, error: "この操作には管理者権限が必要です" };
	}

	if (userId === currentUser.discordId) {
		return { success: false as const, error: "自分自身のロールや状態は変更できません" };
	}

	return { success: true as const };
}

// ヘルパー関数：更新データの構築
function buildUpdateData(
	input: UpdateUserInput & { role?: "member" | "moderator" | "admin"; isActive?: boolean },
): { success: true; data: Record<string, unknown> } | { success: false; error: string } {
	const updateData: Record<string, unknown> = {
		updatedAt: new Date().toISOString(),
	};

	// 基本フィールドの更新
	if (input.displayName !== undefined) {
		updateData.displayName = input.displayName;
	}
	if (input.isPublicProfile !== undefined) {
		updateData.isPublicProfile = input.isPublicProfile;
	}
	if (input.showStatistics !== undefined) {
		updateData.showStatistics = input.showStatistics;
	}

	// 管理者専用フィールドの更新
	if ("role" in input && input.role !== undefined) {
		const validRoles = ["member", "moderator", "admin"];
		if (!validRoles.includes(input.role)) {
			return { success: false as const, error: "無効なロールが指定されました" };
		}
		updateData.role = input.role;
	}

	if ("isActive" in input && input.isActive !== undefined) {
		updateData.isActive = input.isActive;
	}

	return { success: true as const, data: updateData };
}

/**
 * 管理者用：ユーザー情報を更新するServer Action
 */
export async function updateUser(
	userId: string,
	input: UpdateUserInput & { role?: "member" | "moderator" | "admin"; isActive?: boolean },
): Promise<{ success: true; data: { message: string } } | { success: false; error: string }> {
	try {
		logger.info("ユーザー情報更新を開始", { userId });

		// 認証チェック（管理者権限必須）
		const user = await requireAuth();
		const authResult = await validateUserUpdateAuth(userId, user);
		if (!authResult.success) {
			return authResult;
		}

		// 入力データのバリデーション
		const validationResult = UpdateUserInputSchema.safeParse(input);
		if (!validationResult.success) {
			logger.warn("入力データのバリデーション失敗", {
				errors: validationResult.error.issues,
				input,
			});
			return {
				success: false,
				error: `入力データが無効です: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
			};
		}

		const firestore = getFirestore();
		const userRef = firestore.collection("users").doc(userId);

		// ユーザーの存在確認
		const userDoc = await userRef.get();
		if (!userDoc.exists) {
			return {
				success: false,
				error: "指定されたユーザーが見つかりません",
			};
		}

		// 更新データの構築
		const updateResult = buildUpdateData(input);
		if (!updateResult.success) {
			return { success: false, error: updateResult.error };
		}

		// Firestoreを更新
		await userRef.update(updateResult.data);

		// キャッシュの無効化
		revalidatePath("/admin/users");
		revalidatePath(`/users/${userId}`);

		logger.info("ユーザー情報更新が正常に完了", {
			userId,
			updatedBy: user.discordId,
			updatedFields: Object.keys(updateResult.data),
		});

		return {
			success: true,
			data: { message: "ユーザー情報を更新しました" },
		};
	} catch (error) {
		logger.error("ユーザー情報更新でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			userId,
		});

		return {
			success: false,
			error: "ユーザー情報の更新に失敗しました。しばらく時間をおいてから再度お試しください。",
		};
	}
}

/**
 * 管理者用：ユーザーを非アクティブ化するServer Action
 */
export async function deactivateUser(
	userId: string,
): Promise<{ success: true; data: { message: string } } | { success: false; error: string }> {
	try {
		logger.info("ユーザー非アクティブ化を開始", { userId });

		// 認証チェック（管理者権限必須）
		const user = await requireAuth();
		if (user.role !== "admin") {
			logger.warn("管理者権限が必要", { userId: user.discordId, targetUserId: userId });
			return {
				success: false,
				error: "この操作には管理者権限が必要です",
			};
		}

		// 自分自身の非アクティブ化を防止
		if (userId === user.discordId) {
			return {
				success: false,
				error: "自分自身を非アクティブ化することはできません",
			};
		}

		const firestore = getFirestore();
		const userRef = firestore.collection("users").doc(userId);

		// ユーザーの存在確認
		const userDoc = await userRef.get();
		if (!userDoc.exists) {
			return {
				success: false,
				error: "指定されたユーザーが見つかりません",
			};
		}

		// 物理削除ではなく非アクティブ化
		await userRef.update({
			isActive: false,
			deletedAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});

		// キャッシュの無効化
		revalidatePath("/admin/users");
		revalidatePath(`/users/${userId}`);

		logger.info("ユーザー非アクティブ化が正常に完了", {
			userId,
			deactivatedBy: user.discordId,
		});

		return {
			success: true,
			data: { message: "ユーザーを非アクティブ化しました" },
		};
	} catch (error) {
		logger.error("ユーザー非アクティブ化でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			userId,
		});

		return {
			success: false,
			error: "ユーザーの非アクティブ化に失敗しました。しばらく時間をおいてから再度お試しください。",
		};
	}
}

// ヘルパー関数：Firestoreクエリの構築
function buildUsersQuery(
	firestore: FirebaseFirestore.Firestore,
	validatedQuery: UserQuery,
	isAdmin: boolean,
) {
	let firestoreQuery = firestore.collection("users").where("isActive", "==", true);

	// 管理者以外は公開プロフィールのみ
	if (!isAdmin && validatedQuery.onlyPublic !== false) {
		firestoreQuery = firestoreQuery.where("isPublicProfile", "==", true);
	}

	// ロールフィルター
	if (validatedQuery.role) {
		firestoreQuery = firestoreQuery.where("role", "==", validatedQuery.role);
	}

	// 並び順の設定
	switch (validatedQuery.sortBy) {
		case "newest":
			firestoreQuery = firestoreQuery.orderBy("createdAt", "desc");
			break;
		case "oldest":
			firestoreQuery = firestoreQuery.orderBy("createdAt", "asc");
			break;
		case "mostActive":
			firestoreQuery = firestoreQuery.orderBy("totalPlayCount", "desc");
			break;
		case "alphabetical":
			firestoreQuery = firestoreQuery.orderBy("displayName", "asc");
			break;
		default:
			firestoreQuery = firestoreQuery.orderBy("createdAt", "desc");
	}

	return firestoreQuery;
}

// ヘルパー関数：クライアントサイドフィルタリング
function applyClientSideFiltering(users: FrontendUserData[], searchText?: string) {
	if (!searchText) return users;

	const searchLower = searchText.toLowerCase();
	return users.filter(
		(user) =>
			user.username.toLowerCase().includes(searchLower) ||
			user.displayName.toLowerCase().includes(searchLower) ||
			user.globalName?.toLowerCase().includes(searchLower),
	);
}

/**
 * ユーザー一覧を取得するServer Action
 */
export async function getUsers(
	query: Partial<UserQuery> = {},
): Promise<{ success: true; data: UserListResult } | { success: false; error: string }> {
	try {
		// 認証チェック（認証ユーザーのみ）
		const currentUser = await requireAuth();
		const isAdmin = currentUser.role === "admin";

		// クエリのバリデーション
		const validationResult = UserQuerySchema.safeParse(query);
		if (!validationResult.success) {
			return {
				success: false,
				error: `検索条件が無効です: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
			};
		}

		const validatedQuery = validationResult.data;
		const firestore = getFirestore();

		// Firestoreクエリの構築
		let firestoreQuery = buildUsersQuery(firestore, validatedQuery, isAdmin);

		// ページネーション適用
		if (validatedQuery.startAfter) {
			const startAfterDoc = await firestore
				.collection("users")
				.doc(validatedQuery.startAfter)
				.get();
			if (startAfterDoc.exists) {
				firestoreQuery = firestoreQuery.startAfter(startAfterDoc);
			}
		}

		// limit+1を取得して、次のページがあるかどうかを判定
		const snapshot = await firestoreQuery.limit(validatedQuery.limit + 1).get();

		if (snapshot.empty) {
			return {
				success: true,
				data: { users: [], hasMore: false },
			};
		}

		const docs = snapshot.docs;
		const hasMore = docs.length > validatedQuery.limit;
		const userDocs = hasMore ? docs.slice(0, -1) : docs;

		// データ変換とフィルタリング
		let users = userDocs.map((doc) => {
			const data = { discordId: doc.id, ...doc.data() } as FirestoreUserData;
			return convertFirestoreUserToFrontend(data);
		});

		// クライアントサイドフィルタリング（Firestoreでは対応できない条件）
		users = applyClientSideFiltering(users, validatedQuery.searchText);

		const lastUser = users.length > 0 ? users[users.length - 1] : undefined;

		// 総件数の取得（管理者のみ）
		let totalCount: number | undefined;
		if (isAdmin) {
			const countSnapshot = await firestore.collection("users").get();
			totalCount = countSnapshot.size;
		}

		return {
			success: true,
			data: {
				users,
				hasMore,
				lastUser,
				totalCount,
			},
		};
	} catch (error) {
		logger.error("ユーザー一覧取得でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return {
			success: false,
			error: "ユーザー一覧の取得に失敗しました。",
		};
	}
}

/**
 * 特定のユーザー情報を取得するServer Action
 */
export async function getUserById(
	userId: string,
): Promise<{ success: true; data: FrontendUserData } | { success: false; error: string }> {
	try {
		if (!userId || typeof userId !== "string") {
			return {
				success: false,
				error: "ユーザーIDが指定されていません",
			};
		}

		// 認証チェック
		const currentUser = await requireAuth();
		const isAdmin = currentUser.role === "admin";
		const isOwnProfile = currentUser.discordId === userId;

		const firestore = getFirestore();
		const doc = await firestore.collection("users").doc(userId).get();

		if (!doc.exists) {
			return {
				success: false,
				error: "指定されたユーザーが見つかりません",
			};
		}

		const data = { discordId: doc.id, ...doc.data() } as FirestoreUserData;

		// プライベートプロフィールの場合、管理者または本人以外はアクセス不可
		if (!data.isPublicProfile && !isAdmin && !isOwnProfile) {
			return {
				success: false,
				error: "このユーザーのプロフィールは非公開です",
			};
		}

		// 非アクティブユーザーの場合、管理者以外はアクセス不可
		if (!data.isActive && !isAdmin) {
			return {
				success: false,
				error: "このユーザーは利用できません",
			};
		}

		const frontendData = convertFirestoreUserToFrontend(data);

		return {
			success: true,
			data: frontendData,
		};
	} catch (error) {
		logger.error("getUserById failed", {
			userId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return {
			success: false,
			error: "ユーザー情報の取得に失敗しました",
		};
	}
}

/**
 * ユーザー統計を更新するServer Action（内部使用）
 */
export async function updateUserStats(
	userId: string,
	stats: {
		incrementAudioButtons?: boolean;
		incrementPlayCount?: number;
		decrementAudioButtons?: boolean;
		decrementPlayCount?: number;
	},
): Promise<{ success: boolean; error?: string }> {
	try {
		if (!userId || typeof userId !== "string") {
			return {
				success: false,
				error: "ユーザーIDが指定されていません",
			};
		}

		const firestore = getFirestore();
		const userRef = firestore.collection("users").doc(userId);

		// ユーザーの存在確認
		const userDoc = await userRef.get();
		if (!userDoc.exists) {
			return {
				success: false,
				error: "指定されたユーザーが見つかりません",
			};
		}

		// 更新データの作成
		const updateData: Record<string, unknown> = {
			updatedAt: new Date().toISOString(),
		};

		if (stats.incrementAudioButtons) {
			updateData.audioButtonsCount = FieldValue.increment(1);
		}

		if (stats.decrementAudioButtons) {
			updateData.audioButtonsCount = FieldValue.increment(-1);
		}

		if (stats.incrementPlayCount) {
			updateData.totalPlayCount = FieldValue.increment(stats.incrementPlayCount);
		}

		if (stats.decrementPlayCount) {
			updateData.totalPlayCount = FieldValue.increment(-stats.decrementPlayCount);
		}

		// Firestoreを更新
		await userRef.update(updateData);

		// 統計情報更新時はページリロードを避けるため、revalidatePathを削除

		return { success: true };
	} catch (error) {
		logger.error("ユーザー統計更新でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			userId,
			stats,
		});

		return {
			success: false,
			error: "ユーザー統計の更新に失敗しました",
		};
	}
}

/**
 * FirestoreUserDataをFrontendUserDataに変換するヘルパー関数
 */
function convertFirestoreUserToFrontend(data: FirestoreUserData): FrontendUserData {
	return {
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
		avatarUrl: createDiscordAvatarUrl(data.discordId, data.avatar),
		memberSince: formatMemberSince(data.createdAt),
		lastActiveText: formatRelativeTime(data.lastLoginAt),
	};
}
