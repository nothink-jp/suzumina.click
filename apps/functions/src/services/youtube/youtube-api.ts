import type { youtube_v3 } from "googleapis";
import { google } from "googleapis";
import { getYouTubeConfig } from "../../infrastructure/management/config-manager";
import {
	canExecuteOperation,
	getYouTubeQuotaMonitor,
	recordQuotaUsage,
} from "../../infrastructure/monitoring/youtube-quota-monitor";
import { SUZUKA_MINASE_CHANNEL_ID } from "../../shared/common";
import * as logger from "../../shared/logger";

// YouTube API クォータ制限関連の定数
export const QUOTA_EXCEEDED_CODE = 403; // クォータ超過エラーコード

// 設定を取得
const config = getYouTubeConfig();
export const MAX_VIDEOS_PER_BATCH = config.maxBatchSize; // YouTube APIの最大結果数（設定から取得）

// YouTube APIの環境変数チェックはinitializeYouTubeClient()内で実行

/**
 * YouTube APIクライアントを初期化する
 *
 * @returns YouTube APIクライアントとエラー情報のタプル
 */
export function initializeYouTubeClient(): [
	youtube_v3.Youtube | undefined,
	{ videoCount: number; error: string } | undefined,
] {
	// YouTube API キーの取得と検証
	const apiKey = process.env.YOUTUBE_API_KEY;
	if (!apiKey) {
		logger.error("環境変数に YOUTUBE_API_KEY が設定されていません");
		return [undefined, { videoCount: 0, error: "YouTube API Keyが設定されていません" }];
	}

	// YouTubeクライアント初期化
	const youtube = google.youtube({
		version: "v3",
		auth: apiKey,
	});

	return [youtube, undefined];
}

/**
 * YouTube動画IDを検索して取得
 *
 * @param youtube - YouTube APIクライアント
 * @param pageToken - 継続ページトークン（続きから取得する場合）
 * @returns Promise<{items: youtube_v3.Schema$SearchResult[], nextPageToken?: string}> - 検索結果と次ページトークン
 */
export async function searchVideos(
	youtube: youtube_v3.Youtube,
	pageToken?: string,
): Promise<{
	items: youtube_v3.Schema$SearchResult[];
	nextPageToken?: string;
}> {
	// クォータチェック
	if (!canExecuteOperation("search")) {
		throw new Error("YouTube APIクォータが不足しています");
	}

	try {
		// YouTube API 呼び出し
		const response = await youtube.search.list({
			part: ["id", "snippet"], // snippetも取得して配信状態を確認できるようにする
			channelId: SUZUKA_MINASE_CHANNEL_ID,
			maxResults: MAX_VIDEOS_PER_BATCH,
			type: ["video"],
			order: "date",
			pageToken: pageToken,
		});
		const searchResponse: youtube_v3.Schema$SearchListResponse = response.data;

		// 成功時にクォータ使用量を記録
		recordQuotaUsage("search");
		getYouTubeQuotaMonitor().logQuotaUsage("search", 100, {
			channelId: SUZUKA_MINASE_CHANNEL_ID,
			maxResults: MAX_VIDEOS_PER_BATCH,
			pageToken: pageToken || "none",
			resultCount: searchResponse.items?.length || 0,
		});

		return {
			items: searchResponse.items || [],
			nextPageToken: searchResponse.nextPageToken ?? undefined,
		};
	} catch (error: unknown) {
		// エラーログ出力
		logger.error("YouTube API 呼び出しエラー:", error);
		throw error;
	}
}

/**
 * 動画IDから詳細情報を取得
 *
 * @param youtube - YouTube APIクライアント
 * @param videoIds - 取得する動画IDの配列
 * @returns Promise<youtube_v3.Schema$Video[]> - 取得した動画詳細情報
 */
export async function fetchVideoDetails(
	youtube: youtube_v3.Youtube,
	videoIds: string[],
): Promise<youtube_v3.Schema$Video[]> {
	logger.debug("動画の詳細情報を取得中...");
	const videoDetails: youtube_v3.Schema$Video[] = [];

	// 必要なクォータ量を事前計算
	const requiredBatches = Math.ceil(videoIds.length / MAX_VIDEOS_PER_BATCH);
	const totalQuotaCost = requiredBatches * 8; // videosFullDetails cost

	// クォータチェック
	if (!canExecuteOperation("videosFullDetails", requiredBatches)) {
		logger.warn("YouTube APIクォータが不足しています", {
			requiredBatches,
			totalQuotaCost,
			videoCount: videoIds.length,
		});

		// 部分的な取得を提案
		const quotaMonitor = getYouTubeQuotaMonitor();
		const suggestion = quotaMonitor.suggestOptimalOperations(videoIds.length);

		if (!suggestion.feasible) {
			throw new Error(`YouTube APIクォータが不足しています。${suggestion.alternatives.join(", ")}`);
		}
	}

	// YouTube API の制限（最大50件）に合わせてバッチ処理
	for (let i = 0; i < videoIds.length; i += MAX_VIDEOS_PER_BATCH) {
		try {
			const batchIds = videoIds.slice(i, i + MAX_VIDEOS_PER_BATCH);

			// YouTube API 呼び出し
			const response = await youtube.videos.list({
				part: [
					"snippet",
					"contentDetails",
					"statistics",
					"liveStreamingDetails",
					"topicDetails",
					"status",
					"recordingDetails",
					"player",
				],
				id: batchIds,
				maxResults: MAX_VIDEOS_PER_BATCH,
			});
			const videoResponse: youtube_v3.Schema$VideoListResponse = response.data;

			// 成功時にクォータ使用量を記録
			recordQuotaUsage("videosFullDetails", batchIds.length);
			getYouTubeQuotaMonitor().logQuotaUsage("videosFullDetails", 8 * batchIds.length, {
				batchNumber: Math.floor(i / MAX_VIDEOS_PER_BATCH) + 1,
				batchSize: batchIds.length,
				resultCount: videoResponse.items?.length || 0,
			});

			if (videoResponse.items) {
				videoDetails.push(...videoResponse.items);
			}
			logger.debug(
				`${videoResponse.items?.length ?? 0}件の動画詳細を取得しました（バッチ ${Math.floor(i / MAX_VIDEOS_PER_BATCH) + 1}）`,
			);
		} catch (error: unknown) {
			// エラーログ出力
			logger.error("YouTube API 呼び出しエラー:", error);
			throw error;
		}
	}

	logger.info(`取得した動画詳細合計: ${videoDetails.length}件`);
	return videoDetails;
}

/**
 * 検索結果から動画IDを抽出
 *
 * @param searchItems - 検索結果アイテム
 * @returns 動画IDの配列
 */
export function extractVideoIds(searchItems: youtube_v3.Schema$SearchResult[]): string[] {
	return searchItems.map((item) => item.id?.videoId).filter((id): id is string => !!id);
}

/**
 * プレイリスト情報の型定義
 */
export interface PlaylistInfo {
	id: string;
	title: string;
	videoCount: number;
	description: string;
	publishedAt: string;
}

/**
 * プレイリスト→動画マッピングの型定義
 */
export interface PlaylistVideoMapping {
	videoId: string;
	playlistTitles: string[];
}

/**
 * チャンネルのプレイリスト一覧を取得
 * 既存のクォータ管理システムを活用
 *
 * @param youtube - YouTube APIクライアント
 * @param channelId - チャンネルID
 * @returns Promise<PlaylistInfo[]> - プレイリスト情報の配列
 */
export async function fetchChannelPlaylists(
	youtube: youtube_v3.Youtube,
	channelId: string,
): Promise<PlaylistInfo[]> {
	// クォータチェック
	if (!canExecuteOperation("playlists")) {
		throw new Error("YouTube APIクォータが不足しています");
	}

	try {
		logger.debug("チャンネルプレイリスト取得開始", { channelId });

		const response = await youtube.playlists.list({
			part: ["snippet", "contentDetails"],
			channelId: channelId,
			maxResults: 50,
		});

		// 成功時にクォータ使用量を記録
		recordQuotaUsage("playlists");
		getYouTubeQuotaMonitor().logQuotaUsage("playlists", 1, {
			channelId,
			resultCount: response.data.items?.length || 0,
		});

		const playlists =
			response.data.items?.map((playlist) => ({
				id: playlist.id || "",
				title: playlist.snippet?.title || "",
				videoCount: playlist.contentDetails?.itemCount || 0,
				description: playlist.snippet?.description || "",
				publishedAt: playlist.snippet?.publishedAt || "",
			})) || [];

		logger.info(`チャンネル ${channelId} のプレイリスト取得完了: ${playlists.length}件`);
		return playlists;
	} catch (error: unknown) {
		logger.error("プレイリスト取得エラー:", error);
		throw error;
	}
}

/**
 * プレイリストの動画一覧を取得
 * 既存のページネーション処理パターンを活用
 *
 * @param youtube - YouTube APIクライアント
 * @param playlistId - プレイリストID
 * @returns Promise<string[]> - 動画IDの配列
 */
export async function fetchPlaylistItems(
	youtube: youtube_v3.Youtube,
	playlistId: string,
): Promise<string[]> {
	const videoIds: string[] = [];
	let nextPageToken: string | undefined;
	let pageCount = 0;

	logger.debug("プレイリストアイテム取得開始", { playlistId });

	do {
		// クォータチェック
		if (!canExecuteOperation("playlistItems")) {
			logger.warn("プレイリストアイテム取得でクォータ不足", {
				playlistId,
				pageCount,
				currentVideoIds: videoIds.length,
			});
			break;
		}

		try {
			const response = await youtube.playlistItems.list({
				part: ["contentDetails"],
				playlistId: playlistId,
				maxResults: MAX_VIDEOS_PER_BATCH, // 既存の定数を活用
				pageToken: nextPageToken,
			});

			// 成功時にクォータ使用量を記録
			recordQuotaUsage("playlistItems");
			getYouTubeQuotaMonitor().logQuotaUsage("playlistItems", 1, {
				playlistId,
				pageNumber: pageCount + 1,
				resultCount: response.data.items?.length || 0,
			});

			const items = response.data.items || [];
			const batchVideoIds = items
				.map((item) => item.contentDetails?.videoId)
				.filter((id): id is string => typeof id === "string" && id.length > 0);

			videoIds.push(...batchVideoIds);
			nextPageToken = response.data.nextPageToken || undefined;
			pageCount++;

			logger.debug(`プレイリスト ${playlistId} ページ ${pageCount}: ${batchVideoIds.length}件取得`);
		} catch (error: unknown) {
			logger.error("プレイリストアイテム取得エラー:", error);
			break;
		}
	} while (nextPageToken);

	logger.info(`プレイリスト ${playlistId} 総取得動画数: ${videoIds.length}件`);
	return videoIds;
}
