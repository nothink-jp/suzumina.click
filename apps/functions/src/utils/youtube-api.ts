import type { youtube_v3 } from "googleapis";
import { google } from "googleapis";
import { SUZUKA_MINASE_CHANNEL_ID } from "./common";
import * as logger from "./logger";
import type { ApiError } from "./retry";
import { retryApiCall } from "./retry";

// YouTube API クォータ制限関連の定数
export const MAX_VIDEOS_PER_BATCH = 50; // YouTube APIの最大結果数
export const QUOTA_EXCEEDED_CODE = 403; // クォータ超過エラーコード

/**
 * YouTube API初期化時のチェック
 */
(function initializeYoutubeModule() {
	// 環境変数のチェック
	if (!process.env.YOUTUBE_API_KEY) {
		logger.warn("環境変数 YOUTUBE_API_KEY が設定されていません");
	}
})();

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
	try {
		// YouTube API 呼び出し（リトライ機能付き）
		const searchResponse: youtube_v3.Schema$SearchListResponse = await retryApiCall(async () => {
			const response = await youtube.search.list({
				part: ["id", "snippet"], // snippetも取得して配信状態を確認できるようにする
				channelId: SUZUKA_MINASE_CHANNEL_ID,
				maxResults: MAX_VIDEOS_PER_BATCH,
				type: ["video"],
				order: "date",
				pageToken: pageToken,
			});
			return response.data;
		});

		return {
			items: searchResponse.items || [],
			nextPageToken: searchResponse.nextPageToken ?? undefined,
		};
	} catch (error: unknown) {
		const apiError = error as ApiError;
		if (apiError.code === QUOTA_EXCEEDED_CODE) {
			// クォータ超過の場合
			logger.error("YouTube API クォータを超過しました。処理を中断します:", error);
			throw new Error("YouTube APIクォータを超過しました");
		}
		// その他のエラー
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

	// YouTube API の制限（最大50件）に合わせてバッチ処理
	for (let i = 0; i < videoIds.length; i += MAX_VIDEOS_PER_BATCH) {
		try {
			const batchIds = videoIds.slice(i, i + MAX_VIDEOS_PER_BATCH);

			// YouTube API 呼び出し（リトライ機能付き）
			const videoResponse: youtube_v3.Schema$VideoListResponse = await retryApiCall(async () => {
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
				return response.data;
			});

			if (videoResponse.items) {
				videoDetails.push(...videoResponse.items);
			}
			logger.debug(
				`${videoResponse.items?.length ?? 0}件の動画詳細を取得しました（バッチ ${Math.floor(i / MAX_VIDEOS_PER_BATCH) + 1}）`,
			);
		} catch (error: unknown) {
			const apiError = error as ApiError;
			if (apiError.code === QUOTA_EXCEEDED_CODE) {
				// クォータ超過の場合
				logger.error(
					"YouTube API クォータを超過しました。ここまで取得した情報を保存します:",
					error,
				);
				break; // ループを抜けて、ここまで取得したデータだけを保存
			}
			// その他のエラー
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
