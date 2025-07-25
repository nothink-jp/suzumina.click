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

	const convertTimestamp = (value: unknown): string | undefined => {
		if (!value) return undefined;
		if (typeof value === "string") return value;
		if (value instanceof Timestamp) return value.toDate().toISOString();
		if (value instanceof Date) return value.toISOString();
		if (value && typeof value === "object" && "_seconds" in value) {
			return new Date((value as { _seconds: number })._seconds * 1000).toISOString();
		}
		return undefined;
	};

	return {
		scheduledStartTime: convertTimestamp(details.scheduledStartTime),
		scheduledEndTime: convertTimestamp(details.scheduledEndTime),
		actualStartTime: convertTimestamp(details.actualStartTime),
		actualEndTime: convertTimestamp(details.actualEndTime),
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

		// デバッグ: 実際のデータを確認
		if (doc.id === "yKwHLkRMEAo") {
			logger.debug("Raw video data for yKwHLkRMEAo", {
				publishedAt: data.publishedAt,
				publishedAtType: typeof data.publishedAt,
				publishedAtConstructor: data.publishedAt?.constructor?.name,
			});
		}

		// Timestamp型をISO文字列に変換
		// publishedAtの変換
		let publishedAt: string;
		if (data.publishedAt instanceof Timestamp) {
			publishedAt = data.publishedAt.toDate().toISOString();
		} else if (typeof data.publishedAt === "string") {
			// すでにISO文字列の場合はそのまま使用
			publishedAt = data.publishedAt;
		} else if (data.publishedAt instanceof Date) {
			publishedAt = data.publishedAt.toISOString();
		} else if (
			data.publishedAt &&
			typeof data.publishedAt === "object" &&
			"_seconds" in data.publishedAt
		) {
			// Firestore Timestampのプレーンオブジェクト形式
			const seconds = data.publishedAt._seconds as number;
			publishedAt = new Date(seconds * 1000).toISOString();
		} else {
			logger.error("Unknown publishedAt format", {
				videoId: doc.id,
				publishedAt: data.publishedAt,
				type: typeof data.publishedAt,
			});
			// フォールバック: 現在時刻ではなく、適切なデフォルト値を使用
			publishedAt = "2020-01-01T00:00:00.000Z";
		}

		// lastFetchedAtの変換
		let lastFetchedAt: string;
		if (data.lastFetchedAt instanceof Timestamp) {
			lastFetchedAt = data.lastFetchedAt.toDate().toISOString();
		} else if (typeof data.lastFetchedAt === "string") {
			// すでにISO文字列の場合はそのまま使用
			lastFetchedAt = data.lastFetchedAt;
		} else if (data.lastFetchedAt instanceof Date) {
			lastFetchedAt = data.lastFetchedAt.toISOString();
		} else if (
			data.lastFetchedAt &&
			typeof data.lastFetchedAt === "object" &&
			"_seconds" in data.lastFetchedAt
		) {
			// Firestore Timestampのプレーンオブジェクト形式
			const seconds = data.lastFetchedAt._seconds as number;
			lastFetchedAt = new Date(seconds * 1000).toISOString();
		} else {
			logger.error("Unknown lastFetchedAt format", {
				videoId: doc.id,
				lastFetchedAt: data.lastFetchedAt,
				type: typeof data.lastFetchedAt,
			});
			// 現在時刻を使用（データの最終取得時刻なので妥当）
			lastFetchedAt = new Date().toISOString();
		}

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
	year?: string;
	playlistTags?: string[];
	userTags?: string[];
	categoryNames?: string[];
	videoType?: string;
}): Promise<VideoListResult> {
	try {
		const { page = 1, limit = 20, sort = "newest" } = params || {};
		const firestore = getFirestore();
		const videosRef = firestore.collection("videos");

		// クエリを構築
		// 注意: isPrivateとisDeletedのフィルタリングは複合インデックスが必要なため、
		// 現時点では省略し、後でクライアントサイドでフィルタリングする
		let query = videosRef;

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
			.filter((video): video is VideoV2 => video !== null)
			// クライアントサイドでプライベート動画と削除済み動画をフィルタリング
			.filter((video) => {
				const legacy = video.toLegacyFormat();
				return legacy.status?.privacyStatus === "public";
			});

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
				thumbnailUrl: (() => {
					// サムネイルURLの検証
					const url = legacy.thumbnailUrl || "";
					// 有効なURLかチェック
					if (url.startsWith("http://") || url.startsWith("https://")) {
						return url;
					}
					// 無効な場合はYouTubeのデフォルトサムネイルURLを生成
					if (legacy.videoId) {
						return `https://img.youtube.com/vi/${legacy.videoId}/hqdefault.jpg`;
					}
					return "/images/no-thumbnail.svg";
				})(),
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
				createdAt: legacy.publishedAt,
				updatedAt: legacy.lastFetchedAt || new Date().toISOString(),
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
 * Entity V2を使用した特定の動画IDで動画データを取得するServer Action
 * @param videoId - 動画ID
 * @returns 動画データまたはnull
 */
export async function getVideoByIdV2(videoId: string) {
	try {
		const firestore = getFirestore();
		const doc = await firestore.collection("videos").doc(videoId).get();

		if (!doc.exists) {
			return null;
		}

		const v2Video = convertToVideoV2(doc);
		if (!v2Video) {
			return null;
		}

		return convertToFrontendVideo(v2Video.toLegacyFormat());
	} catch (error) {
		logger.error("動画詳細V2取得でエラーが発生", {
			action: "getVideoByIdV2",
			videoId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return null;
	}
}

/**
 * Entity V2を使用した動画総数の取得
 */
export async function getTotalVideoCountV2(params?: {
	year?: string;
	search?: string;
	playlistTags?: string[];
	userTags?: string[];
	categoryNames?: string[];
	videoType?: string;
}) {
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
