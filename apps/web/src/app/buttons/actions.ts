"use server";

import {
	AudioButton,
	type AudioButtonPlainObject,
	type CreateAudioButtonInput,
	type FirestoreServerAudioButtonData,
	type UpdateAudioButtonInput,
} from "@suzumina.click/shared-types";
import { auth } from "@/auth";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

/**
 * FirestoreServerAudioButtonDataをAudioButtonに変換するヘルパー関数
 */
function convertFirestoreToAudioButton(button: FirestoreServerAudioButtonData): AudioButton | null {
	try {
		return AudioButton.fromFirestoreData(button);
	} catch (error) {
		logger.error("AudioButton変換エラー", {
			buttonId: button.id,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Entityを使用した新着音声ボタンの取得
 */
export async function getRecentAudioButtons(limit = 10): Promise<AudioButtonPlainObject[]> {
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
 * Entityを使用した音声ボタンの取得
 */
export async function getAudioButtons(
	query: {
		limit?: number;
		page?: number;
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
			data: { audioButtons: AudioButtonPlainObject[]; totalCount: number; hasMore: boolean };
	  }
	| { success: false; error: string }
> {
	try {
		// 入力検証
		if (query.limit !== undefined && query.limit < 1) {
			return { success: false, error: "検索条件が無効です" };
		}

		const { limit = 20, page = 1, sortBy = "newest", onlyPublic = true, sourceVideoId } = query;

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

		// 総件数を取得するためのクエリ（ソートなし）
		let countQueryRef = firestore.collection("audioButtons").where("isPublic", "==", true);

		if (sourceVideoId) {
			countQueryRef = countQueryRef.where(
				"sourceVideoId",
				"==",
				sourceVideoId,
			) as typeof countQueryRef;
		}

		// TODO: searchText、tags、その他のフィルタ条件をcountQueryRefにも追加する必要があります
		// 現在は簡易実装のため、基本的な条件のみ対応

		// 総件数を取得
		const countSnapshot = await countQueryRef.count().get();
		const totalCount = countSnapshot.data().count;

		// ページネーション計算
		const offset = (page - 1) * limit;
		const hasMore = offset + limit < totalCount;

		// データ取得（offsetを使用）
		queryRef = queryRef.limit(limit) as typeof queryRef;
		if (offset > 0) {
			// offsetを実現するために、まずoffset件スキップするためのクエリを実行
			const skipSnapshot = await queryRef.limit(offset).get();
			if (skipSnapshot.docs.length > 0) {
				const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
				queryRef = queryRef.startAfter(lastDoc) as typeof queryRef;
			}
		}

		const snapshot = await queryRef.get();
		const buttons = snapshot.docs.map((doc) => {
			const data = doc.data() as FirestoreServerAudioButtonData;
			return { ...data, id: doc.id };
		});

		// Entityに変換
		const entityButtons = buttons
			.map(convertFirestoreToAudioButton)
			.filter((button): button is AudioButton => button !== null);

		// Plain Object形式に変換して返す
		const frontendButtons = entityButtons.map((button) => button.toPlainObject());

		return {
			success: true,
			data: {
				audioButtons: frontendButtons,
				totalCount,
				hasMore,
			},
		};
	} catch (error) {
		logger.error("音声ボタン取得でエラーが発生", {
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
): Promise<{ success: true; data: AudioButtonPlainObject } | { success: false; error: string }> {
	try {
		if (!id) {
			return { success: false, error: "音声ボタンIDが指定されていません" };
		}

		const firestore = getFirestore();
		const doc = await firestore.collection("audioButtons").doc(id).get();

		if (!doc.exists) {
			return { success: false, error: "音声ボタンが見つかりません" };
		}

		const data = doc.data() as FirestoreServerAudioButtonData;
		if (!data.isPublic) {
			return { success: false, error: "この音声ボタンは非公開です" };
		}

		// dataにidを含めたデータを作成
		const buttonData = { ...data, id };
		const button = convertFirestoreToAudioButton(buttonData);
		if (!button) {
			return { success: false, error: "音声ボタンのデータ変換に失敗しました" };
		}
		return { success: true, data: button.toPlainObject() };
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

		const data = doc.data() as FirestoreServerAudioButtonData;
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

		// デバッグログを追加
		logger.info("getAudioButtonCount: 音声ボタン数取得開始", { sourceVideoId });

		// Firestoreクエリを作成
		const query = firestore
			.collection("audioButtons")
			.where("sourceVideoId", "==", sourceVideoId)
			.where("isPublic", "==", true);

		try {
			// count()メソッドを試す
			const snapshot = await query.count().get();
			const count = snapshot.data().count;
			logger.info("getAudioButtonCount: count()メソッドで取得成功", { sourceVideoId, count });
			return count;
		} catch (countError) {
			// count()が使えない場合はフォールバック
			logger.warn("getAudioButtonCount: count()メソッドが使用できません、フォールバックします", {
				sourceVideoId,
				error: countError instanceof Error ? countError.message : String(countError),
			});

			// ドキュメントを取得して数える
			const snapshot = await query.limit(1000).get();
			const count = snapshot.size;
			logger.info("getAudioButtonCount: フォールバックで取得成功", { sourceVideoId, count });
			return count;
		}
	} catch (error) {
		logger.error("音声ボタン数取得エラー", {
			sourceVideoId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
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
			const currentData = doc.data() as FirestoreServerAudioButtonData;
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
			const currentData = doc.data() as FirestoreServerAudioButtonData;
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
			const currentData = doc.data() as FirestoreServerAudioButtonData;
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
			const currentData = doc.data() as FirestoreServerAudioButtonData;
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

		const data = doc.data() as FirestoreServerAudioButtonData;
		if (data.createdBy !== session.user.discordId) {
			return { success: false, error: "更新権限がありません" };
		}

		const updates: Partial<FirestoreServerAudioButtonData> = {
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

		const data = doc.data() as FirestoreServerAudioButtonData;
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
			const currentData = doc.data() as FirestoreServerAudioButtonData;
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
