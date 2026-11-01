"use server";

import type {
	AudioButton,
	CreateAudioButtonInput,
	UpdateAudioButtonInput,
} from "@suzumina.click/shared-types";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/server";
import { checkRateLimit, incrementButtonCount } from "@/lib/button-rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { getFirestore } from "@/lib/firestore";
import { updateCounter } from "@/lib/firestore-helpers";
import * as logger from "@/lib/logger";
import { claimPlayCount } from "@/lib/play-count-dedup";
import {
	withAuthenticatedAction,
	withErrorHandling,
	withValidation,
} from "@/lib/server-action-wrapper";

// Internal modules
import { VISIBLE_VIDEOS_TAG } from "../videos/videos-source";
import { loadAllPublicAudioButtons, PUBLIC_AUDIO_BUTTONS_TAG } from "./audio-buttons-source";
import { filterBySearch, filterByTags, sortAudioButtons } from "./lib/audio-button-filters";
import {
	getAudioButtonCount as getButtonCount,
	getPopularAudioButtonTags as getPopularTags,
} from "./lib/audio-button-stats";
import { updateVideoButtonCount, validateVideoForAudioButton } from "./lib/audio-button-validation";
import { convertFirestoreToAudioButton } from "./utils/audio-button-converters";

/**
 * Entityを使用した新着音声ボタンの取得
 */
export async function getRecentAudioButtons(limit = 10): Promise<AudioButton[]> {
	try {
		const result = await getAudioButtonsList({
			limit,
			sortBy: "newest",
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
 * 一覧 Server Action の 1 回あたりの最大件数。クライアントから任意の limit を渡せるため上限で切り詰める。
 * 画面からの最大は一覧の 48 件。これを超える件数が要るサーバー側の用途はサーバー専用の関数を使う
 * （動画の作成済み目印: getPublicAudioButtonStartTimesByVideo、グループビュー: getRecentPublicAudioButtons・SPR-378）
 */
const AUDIO_BUTTON_LIST_MAX_LIMIT = 100;

/**
 * 公開音声ボタンの一覧を取得（ConfigurableList用）
 *
 * クライアントから任意の引数で呼べる Server Action なので、非公開ボタンは引数に関わらず返さない
 * （`isPublic == true` を loadAllPublicAudioButtons のクエリで強制。旧 `onlyPublic` 引数は SPR-332 で撤去）。
 * limit も同じ理由で AUDIO_BUTTON_LIST_MAX_LIMIT に切り詰める
 */
export async function getAudioButtonsList(
	query: {
		limit?: number;
		page?: number;
		sortBy?: "newest" | "oldest" | "popular" | "mostPlayed";
		search?: string;
		videoId?: string;
		tags?: string[];
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
				limit: requestedLimit = 20,
				page = 1,
				sortBy = "newest",
				videoId,
				search,
				tags = [],
			} = validatedQuery;
			const limit = Math.min(requestedLimit, AUDIO_BUTTON_LIST_MAX_LIMIT);

			// 全件（キャッシュ境界）+ in-memory 導出。read は page 番号ではなく公開ボタン件数 ×
			// キャッシュ世代数に比例する（SPR-349）。件数で打ち切らない（超過分が黙って欠ける＝SPR-322）
			const allButtons = await loadAllPublicAudioButtons();
			const byVideo = videoId
				? allButtons.filter((button) => button.videoId === videoId)
				: allButtons;
			const tagFiltered = tags.length > 0 ? filterByTags(byVideo, tags) : byVideo;
			const filteredButtons = sortAudioButtons(
				search ? filterBySearch(tagFiltered, search) : tagFiltered,
				sortBy,
			);

			const startIdx = (page - 1) * limit;
			const endIdx = startIdx + limit;
			return {
				audioButtons: filteredButtons.slice(startIdx, endIdx),
				totalCount: filteredButtons.length,
				hasMore: endIdx < filteredButtons.length,
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
			const user = await getCurrentUser();
			if (!user) {
				throw new Error("ログインが必要です");
			}

			// レート制限チェック
			const rateLimit = await checkRateLimit(user.discordId);
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
				creatorId: user.discordId,
				creatorName: user.displayName || user.username || "Unknown",
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

			// 旧実装は add 直後に update({ id }) で ID を doc 本体へ複製していたが、
			// 読み手は doc.id で常に上書きするため冗長な 2 write だった（SPR-241 で廃止）。

			// レート制限カウントを増やす
			const incremented = await incrementButtonCount(user.discordId);
			if (!incremented) {
				logger.warn("レート制限に達した後のボタン作成", { userId: user.discordId });
			}

			// 動画カウント更新（非同期）
			await updateVideoButtonCount(validatedInput.videoId, firestore);
			// 一覧はインスタンスローカルの全件キャッシュ。作成者自身の次の表示に反映させる（SPR-349）
			updateTag(PUBLIC_AUDIO_BUTTONS_TAG);
			updateTag(VISIBLE_VIDEOS_TAG);

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
			if (!data?.isPublic) {
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
			updateTag(PUBLIC_AUDIO_BUTTONS_TAG);
			updateTag(VISIBLE_VIDEOS_TAG);

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
 * 再生数を 1 増やす（匿名でも呼べる）。
 *
 * 同じクライアント IP × 同じボタンは `PLAY_COUNT_DEDUP_WINDOW_MS` の間 1 回だけ計上する（SPR-334）。
 * 重複は失敗ではないので `success: true, counted: false` を返す。存在しない・非公開のボタンには書き込まない。
 * 再生は「ボタンの更新」ではないため `updatedAt` は触らない。
 * 抑止の確定とカウンタ更新は別トランザクションで、後者が失敗するとその窓は計上されない（過少計上に倒す・意図的）。
 */
export async function incrementPlayCount(
	audioButtonId: string,
): Promise<{ success: boolean; counted?: boolean; error?: string }> {
	if (typeof audioButtonId !== "string" || !audioButtonId || audioButtonId.includes("/")) {
		return { success: false, error: "音声ボタンIDが不正です" };
	}

	try {
		const claim = await claimPlayCount(audioButtonId, getClientIp(await headers()));
		if (claim === "not_found") {
			return { success: false, error: "音声ボタンが見つかりません" };
		}
		if (claim === "duplicate") {
			return { success: true, counted: false };
		}
	} catch (error) {
		logger.error("再生数の重複判定に失敗", {
			action: "incrementPlayCount",
			audioButtonId,
			error: error instanceof Error ? error.message : String(error),
		});
		return { success: false, error: "再生数の更新に失敗しました" };
	}

	const result = await updateCounter("audioButtons", audioButtonId, "stats.playCount", 1, {
		min: 0,
		updateTimestamp: false,
	});
	return { success: result.success, counted: result.success, error: result.error };
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
			updateTag(PUBLIC_AUDIO_BUTTONS_TAG);
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

			// 作成者チェックは意図的に省略（SPR-195）。タグは協働メタデータで、
			// ログイン済みユーザーなら誰でも編集可能とする設計。本文編集（updateAudioButton）が
			// creatorId を要求するのと非対称なのは「タグ=共有・本体=所有」の区別による。

			await docRef.update({
				tags,
				updatedAt: new Date().toISOString(),
			});
			updateTag(PUBLIC_AUDIO_BUTTONS_TAG);

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

/**
 * 人気タグリストを全件取得（一覧ページのタグ絞り込みUI用）
 *
 * limit を引数に取らない: limit は unstable_cache のキーなので、外から値を変えて POST されると
 * 毎回キャッシュを外して audioButtons を全件 .get() させられる（SPR-333）
 */
export async function getPopularAudioButtonTags(): Promise<Array<{ tag: string; count: number }>> {
	return getPopularTags();
}
