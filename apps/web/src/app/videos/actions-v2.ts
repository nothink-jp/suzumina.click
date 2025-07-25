"use server";

import { Video as VideoV2 } from "@suzumina.click/shared-types";
import * as logger from "@/lib/logger";
import { getVideosFromFirestore, getTotalVideoCountFromFirestore } from "@/lib/firestore/client";

/**
 * Entity V2を使用した動画タイトル一覧の取得
 */
export async function getVideoTitlesV2(query: {
	page?: number;
	limit?: number;
	excludePrivate?: boolean;
} = {}) {
	try {
		const { page = 1, limit = 20, excludePrivate = true } = query;
		const offset = (page - 1) * limit;

		// Firestoreから通常のデータを取得
		const { videos, totalCount } = await getVideosFromFirestore({
			limit,
			offset,
			orderBy: "publishedAt",
			orderDirection: "desc",
			excludePrivate,
		});

		// Entity V2に変換
		const v2Videos = videos.map(video => {
			try {
				return VideoV2.fromLegacyFormat({
					id: video.id,
					title: video.title,
					description: video.description || "",
					thumbnailUrl: video.thumbnailUrl,
					publishedAt: video.publishedAt,
					duration: video.duration || "PT0S",
					viewCount: video.viewCount || 0,
					likeCount: video.likeCount || 0,
					commentCount: video.commentCount || 0,
					channelId: video.channelId,
					channelTitle: video.channelTitle,
					tags: video.tags || [],
					isPrivate: video.isPrivate || false,
					isDeleted: video.isDeleted || false,
					isLiveContent: video.isLiveContent || false,
					audioButtonInfo: {
						count: video.audioButtonCount || 0,
						hasButtons: (video.audioButtonCount || 0) > 0,
					},
					createdAt: video.createdAt,
					updatedAt: video.updatedAt,
				});
			} catch (error) {
				logger.error("Video V2変換エラー", {
					videoId: video.id,
					error: error instanceof Error ? error.message : String(error),
				});
				return null;
			}
		}).filter((video): video is VideoV2 => video !== null);

		// レガシー形式に変換して返す（互換性のため）
		const legacyVideos = v2Videos.map(video => video.toLegacyFormat());

		const totalPages = Math.ceil(totalCount / limit);
		
		return {
			videos: legacyVideos,
			currentPage: page,
			totalPages,
			totalCount,
			hasNextPage: page < totalPages,
			hasPreviousPage: page > 1,
		};
	} catch (error) {
		logger.error("動画タイトルV2取得でエラーが発生", {
			action: "getVideoTitlesV2",
			query,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return {
			videos: [],
			currentPage: 1,
			totalPages: 0,
			totalCount: 0,
			hasNextPage: false,
			hasPreviousPage: false,
		};
	}
}

/**
 * Entity V2を使用した動画総数の取得
 */
export async function getTotalVideoCountV2() {
	try {
		return await getTotalVideoCountFromFirestore();
	} catch (error) {
		logger.error("動画総数V2取得でエラーが発生", {
			action: "getTotalVideoCountV2",
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return 0;
	}
}