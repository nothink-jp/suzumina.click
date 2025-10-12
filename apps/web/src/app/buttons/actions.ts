"use server";

import type {
	AudioButton,
	CreateAudioButtonInput,
	UpdateAudioButtonInput,
} from "@suzumina.click/shared-types";
import { checkRateLimit, incrementButtonCount } from "@/actions/rate-limit-actions";
import { auth } from "@/auth";
import { getFirestore } from "@/lib/firestore";
import { updateCounter } from "@/lib/firestore-helpers";
import * as logger from "@/lib/logger";
import {
	withAuthenticatedAction,
	withErrorHandling,
	withValidation,
} from "@/lib/server-action-wrapper";

// Internal modules
import {
	applyFilters,
	applySorting,
	filterBySearch,
	filterByTags,
} from "./lib/audio-button-filters";
import { getAudioButtonCount as getButtonCount } from "./lib/audio-button-stats";
import { updateVideoButtonCount, validateVideoForAudioButton } from "./lib/audio-button-validation";
import {
	convertFirestoreToAudioButton,
	fetchAndConvertButtons,
} from "./utils/audio-button-converters";

// Re-export utility functions
export {
	getPopularAudioButtonTags,
	recalculateAllVideosAudioButtonCount,
} from "./lib/audio-button-stats";

/**
 * Entityを使用した新着音声ボタンの取得
 */
export async function getRecentAudioButtons(limit = 10): Promise<AudioButton[]> {
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
 * 音声ボタンリストを取得（ConfigurableList用）
 */
export async function getAudioButtonsList(
	query: {
		limit?: number;
		page?: number;
		sortBy?: "newest" | "oldest" | "popular" | "mostPlayed";
		onlyPublic?: boolean;
		search?: string;
		videoId?: string;
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
			data: { audioButtons: AudioButton[]; totalCount: number; hasMore: boolean };
	  }
	| { success: false; error: string }
> {
	return withValidation(
		query,
		(input) => {
			if (input.limit !== undefined && input.limit < 1) {
				return "検索条件が無効です";
			}
			return null;
		},
		async (validatedQuery) => {
			const {
				limit = 20,
				page = 1,
				sortBy = "newest",
				onlyPublic = true,
				videoId,
				search,
			} = validatedQuery;

			const firestore = getFirestore();
			let queryRef = firestore
				.collection("audioButtons")
				.select(
					"id",
					"buttonText",
					"description",
					"tags",
					"videoId",
					"videoTitle",
					"videoThumbnailUrl",
					"startTime",
					"endTime",
					"duration",
					"creatorId",
					"creatorName",
					"isPublic",
					"stats",
					"createdAt",
					"updatedAt",
				);

			// フィルタとソートを適用
			queryRef = applyFilters(queryRef, onlyPublic, videoId);
			queryRef = applySorting(queryRef, sortBy);

			// 総件数を取得するためのクエリ
			const countQueryRef = applyFilters(firestore.collection("audioButtons"), onlyPublic, videoId);

			// 総件数を取得
			const countSnapshot = await countQueryRef.count().get();
			const totalCount = countSnapshot.data().count;

			// ページネーション計算
			const offset = (page - 1) * limit;
			const hasMore = offset + limit < totalCount;

			// データ取得（offsetを使用）
			queryRef = queryRef.limit(limit) as typeof queryRef;
			if (offset > 0) {
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
			if (validatedQuery.tags && validatedQuery.tags.length > 0) {
				let allQueryRef = firestore
					.collection("audioButtons")
					.select(
						"id",
						"buttonText",
						"description",
						"tags",
						"videoId",
						"videoTitle",
						"videoThumbnailUrl",
						"startTime",
						"endTime",
						"duration",
						"creatorId",
						"creatorName",
						"isPublic",
						"stats",
						"createdAt",
						"updatedAt",
					);

				allQueryRef = applyFilters(allQueryRef, onlyPublic, videoId);
				allQueryRef = applySorting(allQueryRef, sortBy);
				allQueryRef = allQueryRef.limit(1000) as typeof allQueryRef;

				const allButtons = await fetchAndConvertButtons(allQueryRef);
				const filteredButtons = filterByTags(allButtons, validatedQuery.tags);
				const searchFiltered = search ? filterBySearch(filteredButtons, search) : filteredButtons;

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
						"buttonText",
						"description",
						"tags",
						"videoId",
						"videoTitle",
						"videoThumbnailUrl",
						"startTime",
						"endTime",
						"duration",
						"creatorId",
						"creatorName",
						"isPublic",
						"stats",
						"createdAt",
						"updatedAt",
					);

				allQueryRef = applyFilters(allQueryRef, onlyPublic, videoId);
				allQueryRef = applySorting(allQueryRef, sortBy);
				allQueryRef = allQueryRef.limit(1000) as typeof allQueryRef;

				const allButtons = await fetchAndConvertButtons(allQueryRef);
				const filteredButtons = filterBySearch(allButtons, search);

				const filteredTotal = filteredButtons.length;
				const startIdx = (page - 1) * limit;
				const endIdx = startIdx + limit;
				const paginatedButtons = filteredButtons.slice(startIdx, endIdx);

				finalButtons = paginatedButtons;
				finalTotal = filteredTotal;
				finalHasMore = endIdx < filteredTotal;
			}

			return {
				audioButtons: finalButtons,
				totalCount: finalTotal,
				hasMore: finalHasMore,
			};
		},
		{
			action: "getAudioButtonsList",
			errorMessage: "音声ボタンの取得に失敗しました",
			logContext: { query },
		},
	);
}

/**
 * Create audio button
 */
export async function createAudioButton(
	input: CreateAudioButtonInput,
): Promise<{ success: true; data: { id: string } } | { success: false; error: string }> {
	return withValidation(
		input,
		(data) => {
			if (!data.buttonText?.trim()) {
				return "ボタンテキストは必須です";
			}
			return null;
		},
		async (validatedInput) => {
			const session = await auth();
			if (!session?.user) {
				throw new Error("ログインが必要です");
			}

			// レート制限チェック
			const rateLimit = await checkRateLimit(session.user.discordId);
			if (!rateLimit.canCreate) {
				throw new Error(
					`本日の作成上限（${rateLimit.limit}個）に達しています。明日また作成できます。`,
				);
			}

			const firestore = getFirestore();

			// 動画検証
			const videoValidation = await validateVideoForAudioButton(validatedInput.videoId, firestore);
			if (!videoValidation.valid) {
				throw new Error(videoValidation.error || "動画の検証に失敗しました");
			}

			// 音声ボタン作成
			const duration = validatedInput.endTime - validatedInput.startTime;
			const docRef = await firestore.collection("audioButtons").add({
				buttonText: validatedInput.buttonText,
				videoId: validatedInput.videoId,
				videoTitle: validatedInput.videoTitle,
				startTime: validatedInput.startTime,
				endTime: validatedInput.endTime,
				duration,
				tags: validatedInput.tags || [],
				creatorId: session.user.discordId,
				creatorName: session.user.displayName || session.user.username || "Unknown",
				isPublic: validatedInput.isPublic ?? true,
				stats: {
					playCount: 0,
					likeCount: 0,
					dislikeCount: 0,
					favoriteCount: 0,
					engagementRate: 0,
				},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});

			await docRef.update({ id: docRef.id });

			// レート制限カウントを増やす
			const incremented = await incrementButtonCount(session.user.discordId);
			if (!incremented) {
				logger.warn("レート制限に達した後のボタン作成", { userId: session.user.discordId });
			}

			// 動画カウント更新（非同期）
			await updateVideoButtonCount(validatedInput.videoId, firestore);

			return { id: docRef.id };
		},
		{
			action: "createAudioButton",
			errorMessage: "音声ボタンの作成に失敗しました",
		},
	);
}

/**
 * Get audio button by ID
 */
export async function getAudioButtonById(
	id: string,
): Promise<{ success: true; data: AudioButton } | { success: false; error: string }> {
	return withErrorHandling(
		async () => {
			if (!id) {
				throw new Error("音声ボタンIDが指定されていません");
			}

			const firestore = getFirestore();
			const doc = await firestore.collection("audioButtons").doc(id).get();

			if (!doc.exists) {
				throw new Error("音声ボタンが見つかりません");
			}

			const data = doc.data();
			if (!data || !data.isPublic) {
				throw new Error("この音声ボタンは非公開です");
			}

			const buttonData = {
				...data,
				id,
			} as import("@suzumina.click/shared-types").AudioButtonDocument & { id: string };
			const button = convertFirestoreToAudioButton(buttonData);
			if (!button) {
				throw new Error("音声ボタンのデータ変換に失敗しました");
			}
			return button;
		},
		{
			action: "getAudioButtonById",
			errorMessage: "音声ボタンの取得に失敗しました",
			logContext: { id },
		},
	);
}

/**
 * Delete audio button
 */
export async function deleteAudioButton(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	return withAuthenticatedAction(
		async (user) => {
			if (!audioButtonId) {
				throw new Error("音声ボタンIDが指定されていません");
			}

			const firestore = getFirestore();
			const doc = await firestore.collection("audioButtons").doc(audioButtonId).get();

			if (!doc.exists) {
				throw new Error("音声ボタンが見つかりません");
			}

			const data = doc.data();
			if (!data) {
				throw new Error("音声ボタンのデータが無効です");
			}

			const creatorId = data.creatorId || data.createdBy;
			if (creatorId !== user.discordId) {
				throw new Error("削除権限がありません");
			}

			await doc.ref.delete();

			// 動画のaudioButtonCountを更新
			const videoId = data.videoId;
			if (videoId) {
				await updateVideoButtonCount(videoId, firestore, -1);
			}

			return true;
		},
		{
			action: "deleteAudioButton",
			errorMessage: "音声ボタンの削除に失敗しました",
			logContext: { audioButtonId },
		},
	).then((result) => ({
		success: result.success,
		error: result.success ? undefined : result.error,
	}));
}

/**
 * Increment like count
 */
export async function incrementLikeCount(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	return updateCounter("audioButtons", audioButtonId, "stats.likeCount", 1, { min: 0 });
}

/**
 * Decrement like count
 */
export async function decrementLikeCount(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	return updateCounter("audioButtons", audioButtonId, "stats.likeCount", -1, { min: 0 });
}

/**
 * Increment dislike count
 */
export async function incrementDislikeCount(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	return updateCounter("audioButtons", audioButtonId, "stats.dislikeCount", 1, { min: 0 });
}

/**
 * Decrement dislike count
 */
export async function decrementDislikeCount(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	return updateCounter("audioButtons", audioButtonId, "stats.dislikeCount", -1, { min: 0 });
}

/**
 * Increment play count
 */
export async function incrementPlayCount(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	return updateCounter("audioButtons", audioButtonId, "stats.playCount", 1, { min: 0 });
}

/**
 * Update audio button
 */
export async function updateAudioButton(
	id: string,
	input: UpdateAudioButtonInput,
): Promise<{ success: boolean; error?: string }> {
	return withAuthenticatedAction(
		async (user) => {
			const firestore = getFirestore();
			const docRef = firestore.collection("audioButtons").doc(id);
			const doc = await docRef.get();

			if (!doc.exists) {
				throw new Error("音声ボタンが見つかりません");
			}

			const data = doc.data();
			if (!data) {
				throw new Error("音声ボタンのデータが無効です");
			}

			const creatorId = data.creatorId || data.createdBy;
			if (creatorId !== user.discordId) {
				throw new Error("更新権限がありません");
			}

			const updates: Record<string, unknown> = {
				updatedAt: new Date().toISOString(),
			};

			if (input.buttonText !== undefined) updates.buttonText = input.buttonText;
			if (input.tags !== undefined) updates.tags = input.tags;
			if (input.isPublic !== undefined) updates.isPublic = input.isPublic;

			await docRef.update(updates);
			return true;
		},
		{
			action: "updateAudioButton",
			errorMessage: "音声ボタンの更新に失敗しました",
			logContext: { id, input },
		},
	).then((result) => ({
		success: result.success,
		error: result.success ? undefined : result.error,
	}));
}

/**
 * Update audio button tags
 */
export async function updateAudioButtonTags(
	audioButtonId: string,
	tags: string[],
): Promise<{ success: boolean; error?: string }> {
	return withAuthenticatedAction(
		async (_user) => {
			const firestore = getFirestore();
			const docRef = firestore.collection("audioButtons").doc(audioButtonId);
			const doc = await docRef.get();

			if (!doc.exists) {
				throw new Error("音声ボタンが見つかりません");
			}

			const data = doc.data();
			if (!data) {
				throw new Error("音声ボタンのデータが無効です");
			}

			// タグ編集はログインユーザーなら誰でも可能

			await docRef.update({
				tags,
				updatedAt: new Date().toISOString(),
			});

			return true;
		},
		{
			action: "updateAudioButtonTags",
			errorMessage: "タグの更新に失敗しました",
			logContext: { audioButtonId, tags },
		},
	).then((result) => ({
		success: result.success,
		error: result.success ? undefined : result.error,
	}));
}

/**
 * 動画の音声ボタン数を取得（エクスポート用）
 */
export async function getAudioButtonCount(videoId: string): Promise<number> {
	return getButtonCount(videoId);
}
