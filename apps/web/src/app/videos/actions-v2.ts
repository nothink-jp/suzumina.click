"use server";

import { type DocumentSnapshot, Timestamp } from "@google-cloud/firestore";
import {
	convertToFrontendVideo,
	type FirestoreServerVideoData,
	type VideoListResult,
	Video as VideoV2,
} from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

/**
 * LiveStreamingDetailsの変換ヘルパー
 */
// biome-ignore lint/suspicious/noExplicitAny: Firestoreデータの柔軟な処理に必要
function convertLiveStreamingDetails(details: any): any {
	if (!details) return undefined;
	return {
		scheduledStartTime:
			details.scheduledStartTime instanceof Timestamp
				? details.scheduledStartTime.toDate().toISOString()
				: undefined,
		scheduledEndTime:
			details.scheduledEndTime instanceof Timestamp
				? details.scheduledEndTime.toDate().toISOString()
				: undefined,
		actualStartTime:
			details.actualStartTime instanceof Timestamp
				? details.actualStartTime.toDate().toISOString()
				: undefined,
		actualEndTime:
			details.actualEndTime instanceof Timestamp
				? details.actualEndTime.toDate().toISOString()
				: undefined,
		concurrentViewers: details.concurrentViewers,
	};
}

/**
 * FirestoreデータをVideoV2に変換
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Entity V2変換に必要な複雑度
function convertToVideoV2(doc: DocumentSnapshot): VideoV2 | null {
	try {
		const data = doc.data() as FirestoreServerVideoData;

		// Timestamp型をISO文字列に変換
		const publishedAt =
			data.publishedAt instanceof Timestamp
				? data.publishedAt.toDate().toISOString()
				: new Date().toISOString();

		const lastFetchedAt =
			data.lastFetchedAt instanceof Timestamp
				? data.lastFetchedAt.toDate().toISOString()
				: new Date().toISOString();

		return VideoV2.fromLegacyFormat({
			id: doc.id,
			videoId: data.videoId || doc.id,
			title: data.title,
			description: data.description || "",
			channelId: data.channelId,
			channelTitle: data.channelTitle,
			categoryId: data.categoryId,
			publishedAt,
			lastFetchedAt,
			duration: data.duration,
			dimension: data.dimension,
			definition: data.definition,
			caption: data.caption,
			licensedContent: data.licensedContent,
			statistics: data.statistics
				? {
						viewCount: data.statistics.viewCount || 0,
						likeCount: data.statistics.likeCount || 0,
						dislikeCount: data.statistics.dislikeCount || 0,
						favoriteCount: data.statistics.favoriteCount || 0,
						commentCount: data.statistics.commentCount || 0,
					}
				: undefined,
			status: data.status
				? {
						privacyStatus: data.status.privacyStatus,
						uploadStatus: data.status.uploadStatus,
					}
				: undefined,
			player: data.player,
			tags: data.tags || [],
			playlistTags: data.playlistTags || [],
			userTags: data.userTags || [],
			audioButtonCount: data.audioButtonCount || 0,
			hasAudioButtons: data.hasAudioButtons || false,
			liveStreamingDetails: convertLiveStreamingDetails(data.liveStreamingDetails),
			liveBroadcastContent: data.liveBroadcastContent || "none",
			videoType: data.videoType || "normal",
		});
	} catch (error) {
		logger.error("Video V2変換エラー", {
			videoId: doc.id,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Entity V2を使用した動画タイトル一覧の取得
 */
export async function getVideoTitlesV2(params?: {
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
}): Promise<VideoListResult> {
	try {
		const { page = 1, limit = 20, sort = "newest" } = params || {};
		const firestore = getFirestore();
		const videosRef = firestore.collection("videos");

		// クエリを構築
		let query = videosRef.where("isPrivate", "==", false).where("isDeleted", "==", false);

		// ソート順を設定
		const sortOrder = sort === "oldest" ? "asc" : "desc";
		query = query.orderBy("publishedAt", sortOrder) as typeof query;

		// オフセット設定
		if (page > 1) {
			const offset = (page - 1) * limit;
			query = query.offset(offset) as typeof query;
		}

		// limit+1件取得してhasMoreを判定
		query = query.limit(limit + 1) as typeof query;

		const snapshot = await query.get();
		if (snapshot.empty) {
			return { videos: [], hasMore: false };
		}

		const docs = snapshot.docs;
		const hasMore = docs.length > limit;
		const videoDocs = hasMore ? docs.slice(0, limit) : docs;

		// Entity V2に変換
		const v2Videos = videoDocs
			.map((doc) => convertToVideoV2(doc))
			.filter((video): video is VideoV2 => video !== null);

		// レガシー形式に変換してフロントエンド形式に
		const frontendVideos = v2Videos.map((video) => {
			const legacy = video.toLegacyFormat();
			// Firestoreデータ形式を作成
			const firestoreData = {
				id: legacy.id,
				videoId: legacy.videoId || legacy.id,
				title: legacy.title,
				description: legacy.description || "",
				channelId: legacy.channelId,
				channelTitle: legacy.channelTitle,
				publishedAt: legacy.publishedAt,
				thumbnailUrl: legacy.thumbnailUrl || "",
				lastFetchedAt: legacy.lastFetchedAt || new Date().toISOString(),
				videoType: undefined,
				liveBroadcastContent: "none" as const,
				duration: legacy.duration,
				definition: legacy.definition,
				dimension: legacy.dimension,
				caption: legacy.caption,
				licensedContent: legacy.licensedContent,
				contentRating: undefined,
				regionRestriction: undefined,
				statistics: legacy.statistics,
				liveStreamingDetails: legacy.liveStreamingDetails,
				player: legacy.player,
				recordingDetails: undefined,
				status: legacy.status,
				categoryId: undefined,
				tags: legacy.tags || [],
				playlistTags: legacy.playlistTags || [],
				userTags: legacy.userTags || [],
				topicDetails: undefined,
				audioButtonCount: legacy.audioButtonCount || 0,
				hasAudioButtons: legacy.hasAudioButtons || false,
				isPrivate: legacy.status?.privacyStatus !== "public",
				isDeleted: false,
				isLiveContent: false,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
			// FrontendVideoData形式に変換
			return convertToFrontendVideo(firestoreData);
		});

		return {
			videos: frontendVideos,
			hasMore,
		};
	} catch (error) {
		logger.error("動画タイトルV2取得でエラーが発生", {
			action: "getVideoTitlesV2",
			params,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return {
			videos: [],
			hasMore: false,
		};
	}
}

/**
 * Entity V2を使用した動画総数の取得
 */
export async function getTotalVideoCountV2() {
	try {
		const firestore = getFirestore();
		const snapshot = await firestore
			.collection("videos")
			.where("isPrivate", "==", false)
			.where("isDeleted", "==", false)
			.count()
			.get();
		return snapshot.data().count;
	} catch (error) {
		logger.error("動画総数V2取得でエラーが発生", {
			action: "getTotalVideoCountV2",
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return 0;
	}
}
