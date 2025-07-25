"use server";

import {
	AudioButtonV2,
	convertToFrontendAudioButton,
	type FirestoreAudioButtonData,
	type FrontendAudioButtonData,
} from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

/**
 * Entity V2を使用した新着音声ボタンの取得
 */
export async function getRecentAudioButtonsV2(limit = 10): Promise<FrontendAudioButtonData[]> {
	try {
		const result = await getAudioButtonsV2({
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
export async function getAudioButtonsV2(
	query: {
		limit?: number;
		sortBy?: "newest" | "oldest" | "popular" | "mostPlayed";
		onlyPublic?: boolean;
	} = {},
): Promise<
	| {
			success: true;
			data: { audioButtons: FrontendAudioButtonData[]; totalCount: number; hasMore: boolean };
	  }
	| { success: false; error: string }
> {
	try {
		const { limit = 20, sortBy = "newest", onlyPublic = true } = query;

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
			.map((button: FirestoreAudioButtonData) => {
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
			})
			.filter((button): button is AudioButtonV2 => button !== null);

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
