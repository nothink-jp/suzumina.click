"use server";

import { AudioButtonV2 } from "@suzumina.click/shared-types";
import * as logger from "@/lib/logger";
import { getAudioButtonsFromFirestore, getRecentAudioButtonsFromFirestore } from "@/lib/firestore/client";

/**
 * Entity V2を使用した新着音声ボタンの取得
 */
export async function getRecentAudioButtonsV2(limit = 10) {
	try {
		// Firestoreから通常のデータを取得
		const audioButtons = await getRecentAudioButtonsFromFirestore(limit);
		
		// Entity V2に変換
		const v2Buttons = audioButtons.map(button => {
			try {
				return AudioButtonV2.fromLegacy({
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
					createdAt: button.createdAt,
					updatedAt: button.updatedAt,
				});
			} catch (error) {
				logger.error("AudioButton V2変換エラー", {
					buttonId: button.id,
					error: error instanceof Error ? error.message : String(error),
				});
				return null;
			}
		}).filter((button): button is AudioButtonV2 => button !== null);

		// レガシー形式に変換して返す（互換性のため）
		return v2Buttons.map(button => button.toLegacyFormat());
	} catch (error) {
		logger.error("新着音声ボタンV2取得でエラーが発生", {
			action: "getRecentAudioButtonsV2",
			limit,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return [];
	}
}

/**
 * Entity V2を使用した音声ボタンの取得
 */
export async function getAudioButtonsV2(query: {
	limit?: number;
	sortBy?: "newest" | "popular";
	onlyPublic?: boolean;
} = {}) {
	try {
		const { limit = 20, sortBy = "newest", onlyPublic = true } = query;
		
		// Firestoreから通常のデータを取得
		const result = await getAudioButtonsFromFirestore({
			limit,
			sortBy,
			onlyPublic,
		});

		if (!result.success) {
			return result;
		}

		// Entity V2に変換
		const v2Buttons = result.data.audioButtons.map(button => {
			try {
				return AudioButtonV2.fromLegacy({
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
					createdAt: button.createdAt,
					updatedAt: button.updatedAt,
				});
			} catch (error) {
				logger.error("AudioButton V2変換エラー", {
					buttonId: button.id,
					error: error instanceof Error ? error.message : String(error),
				});
				return null;
			}
		}).filter((button): button is AudioButtonV2 => button !== null);

		// レガシー形式に変換して返す（互換性のため）
		return {
			success: true,
			data: {
				audioButtons: v2Buttons.map(button => button.toLegacyFormat()),
				totalCount: result.data.totalCount,
				hasMore: result.data.hasMore,
			},
		};
	} catch (error) {
		logger.error("音声ボタンV2取得でエラーが発生", {
			action: "getAudioButtonsV2",
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