/**
 * YouTube Firestore Service V1
 *
 * @deprecated Will be removed in v3.0.0 (target: August 31, 2025). Use ./youtube-firestore-v2.ts instead.
 *
 * Migration guide:
 * 1. Import from './youtube-firestore-v2' instead of './youtube-firestore'
 * 2. Use saveVideosToFirestoreV2() instead of saveVideosToFirestore()
 * 3. Use updateVideoWithV2() instead of updateVideoWithDetails()
 * 4. Entity V2 is already enabled in production with feature flags
 *
 * Note: The V2 service automatically adds _v2Migration flag to all new data
 */

import type { FirestoreServerVideoData, LiveBroadcastContent } from "@suzumina.click/shared-types";
import type { youtube_v3 } from "googleapis";
import firestore, { Timestamp } from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";

// Firestore関連の定数
const VIDEOS_COLLECTION = "videos";
const MAX_FIRESTORE_BATCH_SIZE = 500; // Firestoreのバッチ書き込み上限

/**
 * 利用可能な最大サイズのサムネイルURLを取得
 *
 * @param thumbnails - YouTube APIから返されるサムネイル情報
 * @returns 最適なサムネイルURL（見つからない場合は空文字列）
 */
function getBestThumbnailUrl(thumbnails?: youtube_v3.Schema$ThumbnailDetails): string {
	if (!thumbnails) {
		return "";
	}

	return (
		thumbnails.maxres?.url ||
		thumbnails.standard?.url ||
		thumbnails.high?.url ||
		thumbnails.medium?.url ||
		thumbnails.default?.url ||
		""
	);
}

/**
 * YouTube APIの配信状態を型安全なLiveBroadcastContentに変換
 *
 * @param liveBroadcastContent - YouTube APIから返される配信状態
 * @returns 型安全な配信状態
 */
function convertLiveBroadcastContent(
	liveBroadcastContent: string | null | undefined,
): LiveBroadcastContent {
	if (liveBroadcastContent === "live") {
		return "live";
	}
	if (liveBroadcastContent === "upcoming") {
		return "upcoming";
	}
	return "none";
}

/**
 * 基本的な動画データを作成
 */
function createBasicVideoData(
	video: youtube_v3.Schema$Video,
	now: Timestamp,
): Pick<
	FirestoreServerVideoData,
	| "videoId"
	| "title"
	| "description"
	| "publishedAt"
	| "thumbnailUrl"
	| "channelId"
	| "channelTitle"
	| "lastFetchedAt"
	| "liveBroadcastContent"
> {
	return {
		videoId: video.id || "",
		title: video.snippet?.title ?? "",
		description: video.snippet?.description ?? "",
		publishedAt: video.snippet?.publishedAt
			? Timestamp.fromDate(new Date(video.snippet.publishedAt))
			: now,
		thumbnailUrl: getBestThumbnailUrl(video.snippet?.thumbnails),
		channelId: video.snippet?.channelId ?? "",
		channelTitle: video.snippet?.channelTitle ?? "",
		lastFetchedAt: now,
		liveBroadcastContent: convertLiveBroadcastContent(video.snippet?.liveBroadcastContent),
	};
}

/**
 * スニペットから追加データを抽出
 */
function extractSnippetExtras(
	snippet?: youtube_v3.Schema$VideoSnippet,
): Partial<FirestoreServerVideoData> {
	const extras: Partial<FirestoreServerVideoData> = {};

	if (snippet?.categoryId) {
		extras.categoryId = snippet.categoryId;
	}

	if (snippet?.tags) {
		extras.tags = snippet.tags;
	}

	return extras;
}

/**
 * 基本コンテンツ情報を抽出
 */
function extractBasicContentInfo(
	contentDetails: youtube_v3.Schema$VideoContentDetails,
): Partial<FirestoreServerVideoData> {
	const extras: Partial<FirestoreServerVideoData> = {};

	if (contentDetails.duration) {
		extras.duration = contentDetails.duration;
	}
	if (contentDetails.dimension) {
		extras.dimension = contentDetails.dimension;
	}
	if (contentDetails.definition) {
		extras.definition = contentDetails.definition;
	}

	extras.caption = contentDetails.caption === "true";

	if (contentDetails.licensedContent !== undefined && contentDetails.licensedContent !== null) {
		extras.licensedContent = contentDetails.licensedContent;
	}

	return extras;
}

/**
 * コンテンツレーティング情報を抽出
 */
function extractContentRating(
	contentRating: youtube_v3.Schema$VideoContentDetails["contentRating"],
): Record<string, string> | undefined {
	if (!contentRating) {
		return undefined;
	}

	const rating: Record<string, string> = {};
	for (const [key, value] of Object.entries(contentRating)) {
		if (typeof value === "string") {
			rating[key] = value;
		}
	}
	return rating;
}

/**
 * 地域制限情報を抽出
 */
function extractRegionRestriction(
	regionRestriction: youtube_v3.Schema$VideoContentDetails["regionRestriction"],
): FirestoreServerVideoData["regionRestriction"] {
	if (!regionRestriction) {
		return undefined;
	}

	const allowed = regionRestriction.allowed;
	const blocked = regionRestriction.blocked;

	const hasValidAllowed = allowed && allowed.length > 0;
	const hasValidBlocked = blocked && blocked.length > 0;

	if (!hasValidAllowed && !hasValidBlocked) {
		return undefined;
	}

	const restriction: NonNullable<FirestoreServerVideoData["regionRestriction"]> = {};
	if (hasValidAllowed) {
		restriction.allowed = allowed;
	}
	if (hasValidBlocked) {
		restriction.blocked = blocked;
	}
	return restriction;
}

/**
 * contentDetailsから統計データを抽出 - 詳細処理版
 */
function extractContentDetailsExtended(
	contentDetails: youtube_v3.Schema$VideoContentDetails,
): Partial<FirestoreServerVideoData> {
	const extras = extractBasicContentInfo(contentDetails);

	// コンテンツレーティングを追加
	const contentRating = extractContentRating(contentDetails.contentRating);
	if (contentRating) {
		extras.contentRating = contentRating;
	}

	// 地域制限を追加
	const regionRestriction = extractRegionRestriction(contentDetails.regionRestriction);
	if (regionRestriction) {
		extras.regionRestriction = regionRestriction;
	}

	return extras;
}

/**
 * statisticsから統計データを抽出 - 詳細処理版
 */
function extractStatisticsExtended(
	statistics: youtube_v3.Schema$VideoStatistics,
): Partial<FirestoreServerVideoData> {
	return {
		statistics: {
			viewCount: Number.parseInt(statistics.viewCount || "0", 10) || 0,
			likeCount: Number.parseInt(statistics.likeCount || "0", 10) || 0,
			commentCount: Number.parseInt(statistics.commentCount || "0", 10) || 0,
			favoriteCount: Number.parseInt(statistics.favoriteCount || "0", 10) || 0,
		},
	};
}

/**
 * liveStreamingDetailsから配信情報を抽出
 */
function extractLiveStreamingDetails(
	liveStreamingDetails: youtube_v3.Schema$VideoLiveStreamingDetails,
): Partial<FirestoreServerVideoData> {
	return {
		liveStreamingDetails: {
			scheduledStartTime: liveStreamingDetails.scheduledStartTime
				? Timestamp.fromDate(new Date(liveStreamingDetails.scheduledStartTime))
				: undefined,
			scheduledEndTime: liveStreamingDetails.scheduledEndTime
				? Timestamp.fromDate(new Date(liveStreamingDetails.scheduledEndTime))
				: undefined,
			actualStartTime: liveStreamingDetails.actualStartTime
				? Timestamp.fromDate(new Date(liveStreamingDetails.actualStartTime))
				: undefined,
			actualEndTime: liveStreamingDetails.actualEndTime
				? Timestamp.fromDate(new Date(liveStreamingDetails.actualEndTime))
				: undefined,
			concurrentViewers: liveStreamingDetails.concurrentViewers
				? Number.parseInt(liveStreamingDetails.concurrentViewers, 10)
				: undefined,
		},
	};
}

/**
 * topicDetailsからトピック情報を抽出
 */
function extractTopicDetails(
	topicDetails: youtube_v3.Schema$VideoTopicDetails,
): Partial<FirestoreServerVideoData> {
	return {
		topicDetails: {
			topicCategories: topicDetails.topicCategories ?? undefined,
		},
	};
}

/**
 * statusからステータス情報を抽出
 */
function extractStatus(status: youtube_v3.Schema$VideoStatus): Partial<FirestoreServerVideoData> {
	return {
		status: {
			uploadStatus: status.uploadStatus ?? undefined,
			privacyStatus: status.privacyStatus ?? undefined,
			commentStatus: status.license ?? undefined,
		},
	};
}

/**
 * recordingDetailsから録画情報を抽出
 */
function extractRecordingDetails(
	recordingDetails: youtube_v3.Schema$VideoRecordingDetails,
): Partial<FirestoreServerVideoData> {
	return {
		recordingDetails: {
			locationDescription: recordingDetails.locationDescription ?? undefined,
			recordingDate: recordingDetails.recordingDate
				? Timestamp.fromDate(new Date(recordingDetails.recordingDate))
				: undefined,
		},
	};
}

/**
 * YouTube API動画データをFirestore用のデータ形式に変換
 *
 * @param video - YouTube APIから返される動画データ
 * @param now - 現在のタイムスタンプ
 * @param playlistTags - 該当動画のプレイリストタグ（オプション）
 * @returns Firestore用の動画データ、または無効なデータの場合はnull
 */
function createVideoData(
	video: youtube_v3.Schema$Video,
	now: Timestamp,
	playlistTags?: string[],
): FirestoreServerVideoData | null {
	// 必須フィールドの検証
	if (!video.id || !video.snippet) {
		logger.warn("IDまたはスニペットが不足しているため動画をスキップします:", {
			videoId: video.id,
			hasSnippet: !!video.snippet,
		});
		return null;
	}

	// 基本データの作成
	const videoData: FirestoreServerVideoData = {
		...createBasicVideoData(video, now),
		...extractSnippetExtras(video.snippet),
		// 3層タグシステム: プレイリストタグを追加
		playlistTags: playlistTags || [],
		// userTags フィールドを削除（既存値を保持するため）
	};

	// 各パートからのデータを追加
	if (video.contentDetails) {
		Object.assign(videoData, extractContentDetailsExtended(video.contentDetails));
	}

	if (video.statistics) {
		Object.assign(videoData, extractStatisticsExtended(video.statistics));
	}

	if (video.liveStreamingDetails) {
		Object.assign(videoData, extractLiveStreamingDetails(video.liveStreamingDetails));
	}

	if (video.topicDetails) {
		Object.assign(videoData, extractTopicDetails(video.topicDetails));
	}

	if (video.status) {
		Object.assign(videoData, extractStatus(video.status));
	}

	if (video.recordingDetails) {
		Object.assign(videoData, extractRecordingDetails(video.recordingDetails));
	}

	return videoData;
}

/**
 * Firestoreに動画データを保存
 *
 * @deprecated Will be removed in v3.0.0 (target: August 31, 2025). Use saveVideosToFirestoreV2() from './youtube-firestore-v2' instead.
 * @param videoDetails - 保存する動画詳細情報
 * @param playlistMappings - 動画ID → プレイリストタイトル配列のマップ（オプション）
 * @returns Promise<number> - 保存した動画数
 */
export async function saveVideosToFirestore(
	videoDetails: youtube_v3.Schema$Video[],
	playlistMappings?: Map<string, string[]>,
): Promise<number> {
	if (videoDetails.length === 0) {
		logger.debug("保存する動画情報がありません");
		return 0;
	}

	logger.debug("動画データをFirestoreに書き込み中...");
	const now = Timestamp.now();
	const videosCollection = firestore.collection(VIDEOS_COLLECTION);
	let batch = firestore.batch();
	let batchCounter = 0;
	let validVideoCount = 0;

	// 動画データをFirestoreにバッチ書き込み
	for (const video of videoDetails) {
		// プレイリストタグを取得
		const playlistTags = playlistMappings?.get(video.id || "") || [];

		// 動画データを変換（プレイリストタグ付き）
		const videoData = createVideoData(video, now, playlistTags);
		if (!videoData || !video.id) {
			continue;
		}

		// プレイリストタグが付与された場合はログ出力
		if (playlistTags.length > 0) {
			logger.debug(`動画 ${video.id} にプレイリストタグを追加: ${playlistTags.join(", ")}`);
		}

		validVideoCount++;
		const videoRef = videosCollection.doc(video.id);

		// 既存ドキュメントかチェック
		const existingDoc = await videoRef.get();
		const isNewVideo = !existingDoc.exists;

		// 新しい動画の場合のみuserTagsを初期化
		if (isNewVideo) {
			(videoData as any).userTags = [];
		}

		batch.set(videoRef, videoData, { merge: true });
		batchCounter++;

		// バッチサイズの上限に達したらコミット
		if (batchCounter >= MAX_FIRESTORE_BATCH_SIZE) {
			logger.debug(`${batchCounter}件の動画ドキュメントのバッチをコミット中...`);
			await batch
				.commit()
				.catch((err: unknown) =>
					logger.error("Firestoreバッチコミット中にエラーが発生しました (ループ内):", err),
				);
			logger.debug("バッチをコミットしました。バッチとカウンターをリセットします");
			batch = firestore.batch();
			batchCounter = 0;
		}
	}

	// 残りのデータがあればコミット
	if (batchCounter > 0) {
		logger.info(`最終バッチ ${batchCounter}件の動画ドキュメントをコミット中...`);
		await batch
			.commit()
			.then(() => {
				logger.debug("Firestoreバッチコミットが成功しました");
			})
			.catch((err: unknown) => {
				logger.error("最終Firestoreバッチコミット中にエラーが発生しました:", err);
			});
	} else {
		logger.debug("最終バッチに書き込む動画詳細がありませんでした");
	}

	return validVideoCount;
}

/**
 * 単一の動画データをFirestore用のデータ形式に変換（外部公開用）
 *
 * @deprecated Will be removed in v3.0.0 (target: August 31, 2025). Use VideoMapperV2.fromYouTubeAPI() from '../mappers/video-mapper-v2' instead.
 * @param videoData - YouTube APIから返される動画データ
 * @param playlistTags - 該当動画のプレイリストタグ（オプション）
 * @returns Firestore用の動画データ
 */
export function convertVideoDataForFirestore(
	videoData: youtube_v3.Schema$Video,
	playlistTags?: string[],
): FirestoreServerVideoData | null {
	return createVideoData(videoData, Timestamp.now(), playlistTags);
}
