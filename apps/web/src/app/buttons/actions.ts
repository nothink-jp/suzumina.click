"use server";

import {
	AudioButton,
	type CreateAudioButtonInput,
	convertToFrontendAudioButton,
	type FirestoreAudioButtonData,
	type FrontendAudioButtonData,
	type UpdateAudioButtonInput,
} from "@suzumina.click/shared-types";
import { auth } from "@/auth";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

/**
 * Firestore Timestampを文字列に変換するヘルパー関数
 */
function convertTimestampToString(timestamp: unknown): string {
	if (timestamp && typeof timestamp === "object" && "toDate" in timestamp) {
		// Firestore Timestamp型の場合
		const firestoreTimestamp = timestamp as { toDate: () => Date };
		return firestoreTimestamp.toDate().toISOString();
	}
	if (typeof timestamp === "string") {
		return timestamp;
	}
	return new Date().toISOString();
}

/**
 * FirestoreAudioButtonDataをAudioButtonに変換するヘルパー関数
 */
function convertFirestoreToAudioButton(button: FirestoreAudioButtonData): AudioButton | null {
	try {
		// Firestore の Timestamp を文字列に変換
		const normalizedData = {
			id: button.id,
			title: button.title,
			description: button.description,
			tags: button.tags,
			sourceVideoId: button.sourceVideoId,
			sourceVideoTitle: button.sourceVideoTitle,
			startTime: button.startTime,
			endTime: button.endTime,
			createdBy: button.createdBy,
			createdByName: button.createdByName,
			isPublic: button.isPublic,
			playCount: button.playCount,
			likeCount: button.likeCount,
			dislikeCount: button.dislikeCount,
			favoriteCount: button.favoriteCount,
			createdAt: convertTimestampToString(button.createdAt),
			updatedAt: convertTimestampToString(button.updatedAt),
		};
		return AudioButton.fromLegacy(normalizedData);
	} catch (error) {
		logger.error("AudioButton V2変換エラー", {
			buttonId: button.id,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Entity V2を使用した新着音声ボタンの取得
 */
export async function getRecentAudioButtons(limit = 10): Promise<FrontendAudioButtonData[]> {
	try {
		const result = await getAudioButtons({
			limit,
			sortBy: "newest",
			onlyPublic: true,
		});
		if (result.success) {
			return result.data.audioButtons;
		}
		return [];
	} catch (_error) {
		return [];
	}
}

/**
 * Entity V2を使用した音声ボタンの取得
 */
export async function getAudioButtons(
	query: {
		limit?: number;
		sortBy?: "newest" | "oldest" | "popular" | "mostPlayed";
		onlyPublic?: boolean;
		searchText?: string;
		sourceVideoId?: string;
		tags?: string[];
		createdAfter?: string;
		createdBefore?: string;
		playCountMin?: number;
		playCountMax?: number;
		likeCountMin?: number;
		likeCountMax?: number;
		favoriteCountMin?: number;
		favoriteCountMax?: number;
		durationMin?: number;
		durationMax?: number;
	} = {},
): Promise<
	| {
			success: true;
			data: { audioButtons: FrontendAudioButtonData[]; totalCount: number; hasMore: boolean };
	  }
	| { success: false; error: string }
> {
	try {
		// 入力検証
		if (query.limit !== undefined && query.limit < 1) {
			return { success: false, error: "検索条件が無効です" };
		}

		const { limit = 20, sortBy = "newest", onlyPublic = true, sourceVideoId } = query;

		// Firestoreから直接データを取得
		const firestore = getFirestore();
		let queryRef = firestore
			.collection("audioButtons")
			.select(
				"id",
				"title",
				"description",
				"tags",
				"sourceVideoId",
				"sourceVideoTitle",
				"startTime",
				"endTime",
				"createdBy",
				"createdByName",
				"isPublic",
				"playCount",
				"likeCount",
				"dislikeCount",
				"favoriteCount",
				"createdAt",
				"updatedAt",
			);

		if (onlyPublic) {
			queryRef = queryRef.where("isPublic", "==", true) as typeof queryRef;
		}

		if (sourceVideoId) {
			queryRef = queryRef.where("sourceVideoId", "==", sourceVideoId) as typeof queryRef;
		}

		// ソート条件を追加
		switch (sortBy) {
			case "newest":
				queryRef = queryRef.orderBy("createdAt", "desc") as typeof queryRef;
				break;
			case "oldest":
				queryRef = queryRef.orderBy("createdAt", "asc") as typeof queryRef;
				break;
			case "popular":
				queryRef = queryRef.orderBy("favoriteCount", "desc") as typeof queryRef;
				break;
			case "mostPlayed":
				queryRef = queryRef.orderBy("playCount", "desc") as typeof queryRef;
				break;
		}

		// limit + 1件取得してhasMoreを判定
		queryRef = queryRef.limit(limit + 1) as typeof queryRef;

		const snapshot = await queryRef.get();
		const rawButtons = snapshot.docs.map((doc) => {
			const data = doc.data() as FirestoreAudioButtonData;
			return { ...data, id: doc.id };
		});

		// hasMoreの判定とlimit件に切り詰め
		const hasMore = rawButtons.length > limit;
		const buttons = hasMore ? rawButtons.slice(0, limit) : rawButtons;

		// フィルタリングはクエリで実施済みなので、そのまま使用
		const filteredButtons = buttons;

		// Entity V2に変換
		const v2Buttons = filteredButtons
			.map(convertFirestoreToAudioButton)
			.filter((button): button is AudioButton => button !== null);

		// レガシー形式に変換して返す（互換性のため）
		const frontendButtons = v2Buttons.map((button) => {
			const legacy = button.toLegacy();
			return convertToFrontendAudioButton(legacy);
		});

		return {
			success: true,
			data: {
				audioButtons: frontendButtons,
				totalCount: frontendButtons.length,
				hasMore,
			},
		};
	} catch (error) {
		logger.error("音声ボタンV2取得でエラーが発生", {
			action: "getAudioButtons",
			query,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return {
			success: false,
			error: "音声ボタンの取得に失敗しました",
		};
	}
}

/**
 * Create audio button
 */
export async function createAudioButton(
	input: CreateAudioButtonInput,
): Promise<{ success: true; data: { id: string } } | { success: false; error: string }> {
	try {
		// 入力検証
		if (!input.title || input.title.trim() === "") {
			return { success: false, error: "入力データが無効です" };
		}

		const session = await auth();
		if (!session?.user) {
			return { success: false, error: "認証が必要です" };
		}

		const firestore = getFirestore();
		const docRef = await firestore.collection("audioButtons").add({
			...input,
			createdBy: session.user.discordId,
			createdByName: session.user.displayName || session.user.username || "Unknown",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			playCount: 0,
			likeCount: 0,
			dislikeCount: 0,
			favoriteCount: 0,
			isPublic: input.isPublic ?? true,
		});

		// Update with ID
		await docRef.update({ id: docRef.id });

		return { success: true, data: { id: docRef.id } };
	} catch (error) {
		logger.error("音声ボタン作成エラー", { error });
		return { success: false, error: "音声ボタンの作成に失敗しました" };
	}
}

/**
 * Get audio button by ID
 */
export async function getAudioButtonById(
	id: string,
): Promise<{ success: true; data: FrontendAudioButtonData } | { success: false; error: string }> {
	try {
		if (!id) {
			return { success: false, error: "音声ボタンIDが指定されていません" };
		}

		const firestore = getFirestore();
		const doc = await firestore.collection("audioButtons").doc(id).get();

		if (!doc.exists) {
			return { success: false, error: "音声ボタンが見つかりません" };
		}

		const data = doc.data() as FirestoreAudioButtonData;
		if (!data.isPublic) {
			return { success: false, error: "この音声ボタンは非公開です" };
		}

		// dataにidを含めたデータを作成
		const buttonData = { ...data, id };
		const button = convertFirestoreToAudioButton(buttonData);
		if (!button) {
			return { success: false, error: "音声ボタンのデータ変換に失敗しました" };
		}
		return { success: true, data: convertToFrontendAudioButton(button.toLegacy()) };
	} catch (error) {
		logger.error("音声ボタン取得エラー", { id, error });
		return { success: false, error: "音声ボタンの取得に失敗しました" };
	}
}

/**
 * Delete audio button
 */
export async function deleteAudioButton(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		if (!audioButtonId) {
			return { success: false, error: "音声ボタンIDが指定されていません" };
		}

		const session = await auth();
		if (!session?.user) {
			return { success: false, error: "認証が必要です" };
		}

		const firestore = getFirestore();
		const doc = await firestore.collection("audioButtons").doc(audioButtonId).get();

		if (!doc.exists) {
			return { success: false, error: "音声ボタンが見つかりません" };
		}

		const data = doc.data() as FirestoreAudioButtonData;
		if (data.createdBy !== session.user.discordId) {
			return { success: false, error: "削除権限がありません" };
		}

		await doc.ref.delete();
		return { success: true };
	} catch (error) {
		logger.error("音声ボタン削除エラー", { audioButtonId, error });
		return { success: false, error: "音声ボタンの削除に失敗しました" };
	}
}

/**
 * Get audio button count for a video
 */
export async function getAudioButtonCount(sourceVideoId: string): Promise<number> {
	try {
		const firestore = getFirestore();
		const snapshot = await firestore
			.collection("audioButtons")
			.where("sourceVideoId", "==", sourceVideoId)
			.where("isPublic", "==", true)
			.count()
			.get();
		return snapshot.data().count;
	} catch (error) {
		logger.error("音声ボタン数取得エラー", { sourceVideoId, error });
		return 0;
	}
}

/**
 * Increment like count
 */
export async function incrementLikeCount(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const firestore = getFirestore();
		const docRef = firestore.collection("audioButtons").doc(audioButtonId);
		await firestore.runTransaction(async (transaction) => {
			const doc = await transaction.get(docRef);
			if (!doc.exists) {
				throw new Error("音声ボタンが見つかりません");
			}
			const currentData = doc.data() as FirestoreAudioButtonData;
			transaction.update(docRef, {
				likeCount: (currentData.likeCount || 0) + 1,
				updatedAt: new Date().toISOString(),
			});
		});
		return { success: true };
	} catch (error) {
		logger.error("いいね数増加エラー", { audioButtonId, error });
		return { success: false, error: "いいね数の更新に失敗しました" };
	}
}

/**
 * Decrement like count
 */
export async function decrementLikeCount(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const firestore = getFirestore();
		const docRef = firestore.collection("audioButtons").doc(audioButtonId);
		await firestore.runTransaction(async (transaction) => {
			const doc = await transaction.get(docRef);
			if (!doc.exists) {
				throw new Error("音声ボタンが見つかりません");
			}
			const currentData = doc.data() as FirestoreAudioButtonData;
			transaction.update(docRef, {
				likeCount: Math.max(0, (currentData.likeCount || 0) - 1),
				updatedAt: new Date().toISOString(),
			});
		});
		return { success: true };
	} catch (error) {
		logger.error("いいね数減少エラー", { audioButtonId, error });
		return { success: false, error: "いいね数の更新に失敗しました" };
	}
}

/**
 * Increment dislike count
 */
export async function incrementDislikeCount(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const firestore = getFirestore();
		const docRef = firestore.collection("audioButtons").doc(audioButtonId);
		await firestore.runTransaction(async (transaction) => {
			const doc = await transaction.get(docRef);
			if (!doc.exists) {
				throw new Error("音声ボタンが見つかりません");
			}
			const currentData = doc.data() as FirestoreAudioButtonData;
			transaction.update(docRef, {
				dislikeCount: (currentData.dislikeCount || 0) + 1,
				updatedAt: new Date().toISOString(),
			});
		});
		return { success: true };
	} catch (error) {
		logger.error("低評価数増加エラー", { audioButtonId, error });
		return { success: false, error: "低評価数の更新に失敗しました" };
	}
}

/**
 * Decrement dislike count
 */
export async function decrementDislikeCount(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const firestore = getFirestore();
		const docRef = firestore.collection("audioButtons").doc(audioButtonId);
		await firestore.runTransaction(async (transaction) => {
			const doc = await transaction.get(docRef);
			if (!doc.exists) {
				throw new Error("音声ボタンが見つかりません");
			}
			const currentData = doc.data() as FirestoreAudioButtonData;
			transaction.update(docRef, {
				dislikeCount: Math.max(0, (currentData.dislikeCount || 0) - 1),
				updatedAt: new Date().toISOString(),
			});
		});
		return { success: true };
	} catch (error) {
		logger.error("低評価数減少エラー", { audioButtonId, error });
		return { success: false, error: "低評価数の更新に失敗しました" };
	}
}

/**
 * Update audio button
 */
export async function updateAudioButton(
	input: UpdateAudioButtonInput,
): Promise<{ success: boolean; error?: string }> {
	try {
		const session = await auth();
		if (!session?.user) {
			return { success: false, error: "認証が必要です" };
		}

		const firestore = getFirestore();
		const docRef = firestore.collection("audioButtons").doc(input.id);
		const doc = await docRef.get();

		if (!doc.exists) {
			return { success: false, error: "音声ボタンが見つかりません" };
		}

		const data = doc.data() as FirestoreAudioButtonData;
		if (data.createdBy !== session.user.discordId) {
			return { success: false, error: "更新権限がありません" };
		}

		const updates: Partial<FirestoreAudioButtonData> = {
			updatedAt: new Date().toISOString(),
		};

		if (input.title !== undefined) updates.title = input.title;
		if (input.description !== undefined) updates.description = input.description;
		if (input.tags !== undefined) updates.tags = input.tags;
		if (input.isPublic !== undefined) updates.isPublic = input.isPublic;

		await docRef.update(updates);
		return { success: true };
	} catch (error) {
		logger.error("音声ボタン更新エラー", { input, error });
		return { success: false, error: "音声ボタンの更新に失敗しました" };
	}
}

/**
 * Update audio button tags
 */
export async function updateAudioButtonTags(
	audioButtonId: string,
	tags: string[],
): Promise<{ success: boolean; error?: string }> {
	try {
		const session = await auth();
		if (!session?.user) {
			return { success: false, error: "認証が必要です" };
		}

		const firestore = getFirestore();
		const docRef = firestore.collection("audioButtons").doc(audioButtonId);
		const doc = await docRef.get();

		if (!doc.exists) {
			return { success: false, error: "音声ボタンが見つかりません" };
		}

		const data = doc.data() as FirestoreAudioButtonData;
		if (data.createdBy !== session.user.discordId) {
			return { success: false, error: "更新権限がありません" };
		}

		await docRef.update({
			tags,
			updatedAt: new Date().toISOString(),
		});

		return { success: true };
	} catch (error) {
		logger.error("音声ボタンタグ更新エラー", { audioButtonId, tags, error });
		return { success: false, error: "タグの更新に失敗しました" };
	}
}

/**
 * Increment play count
 */
export async function incrementPlayCount(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const firestore = getFirestore();
		const docRef = firestore.collection("audioButtons").doc(audioButtonId);
		await firestore.runTransaction(async (transaction) => {
			const doc = await transaction.get(docRef);
			if (!doc.exists) {
				throw new Error("音声ボタンが見つかりません");
			}
			const currentData = doc.data() as FirestoreAudioButtonData;
			transaction.update(docRef, {
				playCount: (currentData.playCount || 0) + 1,
				updatedAt: new Date().toISOString(),
			});
		});
		return { success: true };
	} catch (error) {
		logger.error("再生回数増加エラー", { audioButtonId, error });
		return { success: false, error: "再生回数の更新に失敗しました" };
	}
}
