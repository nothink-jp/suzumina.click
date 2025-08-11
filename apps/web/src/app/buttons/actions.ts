"use server";

import {
	AudioButton,
	type AudioButtonPlainObject,
	type CreateAudioButtonInput,
	type FirestoreServerAudioButtonData,
	parseDurationToSeconds,
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
		const result = await getAudioButtonsList({
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
/**
 * Firestoreクエリにフィルタを適用
 */
function applyFilters(
	queryRef: FirebaseFirestore.Query,
	onlyPublic: boolean,
	sourceVideoId?: string,
): FirebaseFirestore.Query {
	let filteredQuery = queryRef;

	if (onlyPublic) {
		filteredQuery = filteredQuery.where("isPublic", "==", true) as typeof filteredQuery;
	}

	if (sourceVideoId) {
		filteredQuery = filteredQuery.where(
			"sourceVideoId",
			"==",
			sourceVideoId,
		) as typeof filteredQuery;
	}

	return filteredQuery;
}

/**
 * Firestoreクエリにソート条件を適用
 */
function applySorting(
	queryRef: FirebaseFirestore.Query,
	sortBy: "newest" | "oldest" | "popular" | "mostPlayed",
): FirebaseFirestore.Query {
	switch (sortBy) {
		case "newest":
			return queryRef.orderBy("createdAt", "desc") as typeof queryRef;
		case "mostPlayed":
			return queryRef.orderBy("playCount", "desc") as typeof queryRef;
		default:
			return queryRef.orderBy("createdAt", "desc") as typeof queryRef;
	}
}

/**
 * 検索フィルタを適用
 */
function filterBySearch(
	buttons: AudioButtonPlainObject[],
	search: string,
): AudioButtonPlainObject[] {
	const searchLower = search.toLowerCase();
	return buttons.filter((button) => {
		const titleMatch = button.title.toLowerCase().includes(searchLower);
		const descriptionMatch = button.description?.toLowerCase().includes(searchLower) || false;
		return titleMatch || descriptionMatch;
	});
}

/**
 * タグでフィルタリング（AND検索）
 */
function filterByTags(buttons: AudioButtonPlainObject[], tags: string[]): AudioButtonPlainObject[] {
	return buttons.filter((button) => {
		if (!button.tags || button.tags.length === 0) return false;

		return tags.every((searchTag) => {
			// 完全一致を試す
			const exactMatch = button.tags?.includes(searchTag);
			// 大文字小文字を無視した比較
			const caseInsensitiveMatch = button.tags?.some(
				(buttonTag) => buttonTag.toLowerCase() === searchTag.toLowerCase(),
			);
			// トリムした比較
			const trimmedMatch = button.tags?.some((buttonTag) => buttonTag.trim() === searchTag.trim());

			return exactMatch || caseInsensitiveMatch || trimmedMatch;
		});
	});
}

/**
 * Firestoreから音声ボタンを取得して変換
 */
async function fetchAndConvertButtons(
	queryRef: FirebaseFirestore.Query,
): Promise<AudioButtonPlainObject[]> {
	const snapshot = await queryRef.get();
	const buttons = snapshot.docs.map((doc) => {
		const data = doc.data() as FirestoreServerAudioButtonData;
		return { ...data, id: doc.id };
	});

	const entityButtons = buttons
		.map(convertFirestoreToAudioButton)
		.filter((button): button is AudioButton => button !== null);

	return entityButtons.map((button) => button.toPlainObject());
}

/**
 * 音声ボタンリストを取得（ConfigurableList用）
 */
export async function getAudioButtonsList(
	query: {
		limit?: number;
		page?: number;
		sortBy?: "newest" | "oldest" | "popular" | "mostPlayed";
		onlyPublic?: boolean;
		search?: string;
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

		const {
			limit = 20,
			page = 1,
			sortBy = "newest",
			onlyPublic = true,
			sourceVideoId,
			search,
		} = query;

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

		// フィルタとソートを適用
		queryRef = applyFilters(queryRef, onlyPublic, sourceVideoId);
		queryRef = applySorting(queryRef, sortBy);

		// 総件数を取得するためのクエリ（ソートなし）
		const countQueryRef = applyFilters(
			firestore.collection("audioButtons"),
			onlyPublic,
			sourceVideoId,
		);

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

		const frontendButtons = await fetchAndConvertButtons(queryRef);

		// 検索テキストでフィルタリング（メモリ内検索）
		let finalButtons = frontendButtons;
		let finalTotal = totalCount;
		let finalHasMore = hasMore;

		// タグフィルタリング
		if (query.tags && query.tags.length > 0) {
			// タグの場合も全データを取得してフィルタリング（Firestoreのarray-contains制限のため）
			let allQueryRef = firestore
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

			// フィルタとソートを適用
			allQueryRef = applyFilters(allQueryRef, onlyPublic, sourceVideoId);
			allQueryRef = applySorting(allQueryRef, sortBy);

			// 全データ取得（一時的に1000件まで）
			allQueryRef = allQueryRef.limit(1000) as typeof allQueryRef;
			const allButtons = await fetchAndConvertButtons(allQueryRef);

			// タグでフィルタリング（AND検索）
			const filteredButtons = filterByTags(allButtons, query.tags);

			// さらに検索テキストでフィルタリング
			const searchFiltered = search ? filterBySearch(filteredButtons, search) : filteredButtons;

			// ページネーション再計算
			const filteredTotal = searchFiltered.length;
			const startIdx = (page - 1) * limit;
			const endIdx = startIdx + limit;
			const paginatedButtons = searchFiltered.slice(startIdx, endIdx);

			finalButtons = paginatedButtons;
			finalTotal = filteredTotal;
			finalHasMore = endIdx < filteredTotal;
		} else if (search) {
			// 検索の場合は全データを取得してフィルタリング
			let allQueryRef = firestore
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

			// フィルタとソートを適用
			allQueryRef = applyFilters(allQueryRef, onlyPublic, sourceVideoId);
			allQueryRef = applySorting(allQueryRef, sortBy);

			// 全データ取得（一時的に1000件まで）
			allQueryRef = allQueryRef.limit(1000) as typeof allQueryRef;
			const allButtons = await fetchAndConvertButtons(allQueryRef);

			// タイトルと説明で検索
			const filteredButtons = filterBySearch(allButtons, search);

			// ページネーション再計算
			const filteredTotal = filteredButtons.length;
			const startIdx = (page - 1) * limit;
			const endIdx = startIdx + limit;
			const paginatedButtons = filteredButtons.slice(startIdx, endIdx);

			finalButtons = paginatedButtons;
			finalTotal = filteredTotal;
			finalHasMore = endIdx < filteredTotal;
		}

		// 音声長フィルタはクライアントサイドで実装済み（Firestoreの制限のため）

		return {
			success: true,
			data: {
				audioButtons: finalButtons,
				totalCount: finalTotal,
				hasMore: finalHasMore,
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

		// 動画タイプチェック（配信アーカイブのみ音声ボタン作成可能）
		const videoRef = firestore.collection("videos").doc(input.sourceVideoId);
		const videoDoc = await videoRef.get();
		if (!videoDoc.exists) {
			return { success: false, error: "指定された動画が見つかりません" };
		}

		const videoData = videoDoc.data();

		// 埋め込み制限チェック
		if (videoData?.status?.embeddable === false) {
			return {
				success: false,
				error: "この動画は埋め込みが制限されているため、音声ボタンを作成できません",
			};
		}

		// 配信アーカイブチェック（liveStreamingDetailsの存在と実際の配信時間を確認）
		const hasLiveStreamingDetails = videoData?.liveStreamingDetails?.actualEndTime;
		const duration = videoData?.duration;

		// 15分以上の動画で、配信履歴がある場合のみ許可
		const isArchivedStream =
			hasLiveStreamingDetails && duration && parseDurationToSeconds(duration) > 15 * 60;

		if (!isArchivedStream) {
			// videoTypeも確認（互換性のため）
			if (videoData?.videoType !== "archived") {
				return { success: false, error: "音声ボタンを作成できるのは配信アーカイブのみです" };
			}
		}
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

		// 動画のaudioButtonCountを更新
		try {
			const videoRef = firestore.collection("videos").doc(input.sourceVideoId);
			const videoDoc = await videoRef.get();
			if (videoDoc.exists) {
				const videoData = videoDoc.data();
				const currentCount = videoData?.audioButtonCount || 0;
				await videoRef.update({
					audioButtonCount: currentCount + 1,
					hasAudioButtons: true,
					updatedAt: new Date().toISOString(),
				});
			}
		} catch (updateError) {
			// 動画カウント更新エラーはログのみ（音声ボタン作成は成功として扱う）
			logger.warn("動画のaudioButtonCount更新エラー", {
				videoId: input.sourceVideoId,
				error: updateError,
			});
		}

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

		// 動画のaudioButtonCountを更新
		if (data.sourceVideoId) {
			try {
				const videoRef = firestore.collection("videos").doc(data.sourceVideoId);
				const videoDoc = await videoRef.get();
				if (videoDoc.exists) {
					const videoData = videoDoc.data();
					const currentCount = videoData?.audioButtonCount || 0;
					await videoRef.update({
						audioButtonCount: Math.max(0, currentCount - 1),
						hasAudioButtons: currentCount > 1,
						updatedAt: new Date().toISOString(),
					});
				}
			} catch (updateError) {
				// 動画カウント更新エラーはログのみ（音声ボタン削除は成功として扱う）
				logger.warn("動画のaudioButtonCount更新エラー", {
					videoId: data.sourceVideoId,
					error: updateError,
				});
			}
		}

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
 * 全動画の音声ボタン数を再計算して更新（メンテナンス用）
 */
export async function recalculateAllVideosAudioButtonCount(): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		const firestore = getFirestore();

		// 全動画を取得
		const videosSnapshot = await firestore.collection("videos").get();

		let updatedCount = 0;
		const batch = firestore.batch();

		for (const videoDoc of videosSnapshot.docs) {
			// その動画の音声ボタン数を取得
			const count = await getAudioButtonCount(videoDoc.id);

			// 動画ドキュメントを更新
			batch.update(videoDoc.ref, {
				audioButtonCount: count,
				hasAudioButtons: count > 0,
				updatedAt: new Date().toISOString(),
			});

			updatedCount++;

			// バッチサイズ制限（500）に達したらコミット
			if (updatedCount % 500 === 0) {
				await batch.commit();
				// 新しいバッチを開始
				logger.info(`Updated ${updatedCount} videos...`);
			}
		}

		// 残りをコミット
		if (updatedCount % 500 !== 0) {
			await batch.commit();
		}

		logger.info(`Successfully updated audioButtonCount for ${updatedCount} videos`);
		return { success: true };
	} catch (error) {
		logger.error("音声ボタン数再計算エラー", { error });
		return { success: false, error: "音声ボタン数の再計算に失敗しました" };
	}
}

/**
 * 人気タグリストを取得する
 */
export async function getPopularAudioButtonTags(limit = 30): Promise<
	Array<{
		tag: string;
		count: number;
	}>
> {
	try {
		const firestore = getFirestore();
		const snapshot = await firestore.collection("audioButtons").where("isPublic", "==", true).get();

		const tagCounts = new Map<string, number>();

		for (const doc of snapshot.docs) {
			const data = doc.data() as FirestoreServerAudioButtonData;
			if (Array.isArray(data.tags)) {
				for (const tag of data.tags) {
					if (typeof tag === "string" && tag.trim() !== "") {
						tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
					}
				}
			}
		}

		return Array.from(tagCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, limit)
			.map(([tag, count]) => ({ tag, count }));
	} catch (error) {
		logger.error("人気タグの取得に失敗", { error });
		return [];
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
