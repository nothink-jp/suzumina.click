/**
 * YouTube Service V2
 *
 * Service layer for YouTube data operations using the new Video Entity architecture.
 * Provides YouTube API integration and data transformation to domain entities.
 */

import type { Video } from "@suzumina.click/shared-types";
import type { youtube_v3 } from "googleapis";
import { google } from "googleapis";
import * as logger from "../../shared/logger";
import { mapYouTubeToVideoEntity } from "../mappers/video-mapper";

/**
 * YouTube Service V2 interface
 */
export interface VideoService {
	/**
	 * チャンネルの動画を取得
	 */
	fetchChannelVideos(
		channelId: string,
		maxResults: number,
		pageToken?: string,
	): Promise<{
		videos: Video[];
		nextPageToken?: string;
	}>;

	/**
	 * 特定の動画を取得
	 */
	fetchVideoById(videoId: string): Promise<Video | null>;

	/**
	 * 複数の動画を取得
	 */
	fetchVideosByIds(videoIds: string[]): Promise<Video[]>;
}

/**
 * YouTube Service V2の実装
 */
class YouTubeService implements VideoService {
	private youtube: youtube_v3.Youtube;

	constructor(apiKey: string) {
		this.youtube = google.youtube({
			version: "v3",
			auth: apiKey,
		});
	}

	/**
	 * チャンネルの動画を取得
	 */
	async fetchChannelVideos(
		channelId: string,
		maxResults: number,
		pageToken?: string,
	): Promise<{
		videos: Video[];
		nextPageToken?: string;
	}> {
		try {
			// チャンネルのアップロード動画プレイリストIDを取得
			const channelResponse = await this.youtube.channels.list({
				part: ["contentDetails"],
				id: [channelId],
			});

			const uploadsPlaylistId =
				channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
			if (!uploadsPlaylistId) {
				throw new Error(`チャンネル ${channelId} のアップロードプレイリストが見つかりません`);
			}

			// プレイリストの動画IDを取得
			const playlistResponse = await this.youtube.playlistItems.list({
				part: ["contentDetails"],
				playlistId: uploadsPlaylistId,
				maxResults,
				pageToken,
			});

			const videoIds =
				playlistResponse.data.items
					?.map((item) => item.contentDetails?.videoId)
					.filter((id): id is string => !!id) || [];

			if (videoIds.length === 0) {
				return { videos: [], nextPageToken: playlistResponse.data.nextPageToken || undefined };
			}

			// 動画の詳細情報を取得
			const videosResponse = await this.youtube.videos.list({
				part: ["snippet", "contentDetails", "statistics", "status", "liveStreamingDetails"],
				id: videoIds,
			});

			// Videoエンティティに変換
			const videos: Video[] = [];
			for (const video of videosResponse.data.items || []) {
				try {
					const videoV2 = mapYouTubeToVideoEntity(video);
					if (videoV2) {
						videos.push(videoV2);
					}
				} catch (error) {
					// Log mapping errors for debugging
					logger.debug("Failed to map YouTube video to entity", {
						videoId: video.id,
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}

			return {
				videos,
				nextPageToken: playlistResponse.data.nextPageToken || undefined,
			};
		} catch (error) {
			logger.error("チャンネル動画の取得に失敗しました:", error);
			throw error;
		}
	}

	/**
	 * 特定の動画を取得
	 */
	async fetchVideoById(videoId: string): Promise<Video | null> {
		try {
			const response = await this.youtube.videos.list({
				part: ["snippet", "contentDetails", "statistics", "status", "liveStreamingDetails"],
				id: [videoId],
			});

			const video = response.data.items?.[0];
			if (!video) {
				return null;
			}

			return mapYouTubeToVideoEntity(video);
		} catch (error) {
			logger.error(`動画 ${videoId} の取得に失敗しました:`, error);
			return null;
		}
	}

	/**
	 * 複数の動画を取得
	 */
	async fetchVideosByIds(videoIds: string[]): Promise<Video[]> {
		if (videoIds.length === 0) {
			return [];
		}

		try {
			// YouTube APIの制限に合わせてバッチ処理（最大50件）
			const batchSize = 50;
			const batches: string[][] = [];

			for (let i = 0; i < videoIds.length; i += batchSize) {
				batches.push(videoIds.slice(i, i + batchSize));
			}

			const allVideos: Video[] = [];

			for (const batch of batches) {
				const response = await this.youtube.videos.list({
					part: ["snippet", "contentDetails", "statistics", "status", "liveStreamingDetails"],
					id: batch,
				});

				for (const video of response.data.items || []) {
					try {
						const videoV2 = mapYouTubeToVideoEntity(video);
						if (videoV2) {
							allVideos.push(videoV2);
						}
					} catch (_error) {
						// 変換失敗した動画はスキップ
					}
				}
			}

			return allVideos;
		} catch (error) {
			logger.error("複数動画の取得に失敗しました:", error);
			throw error;
		}
	}
}

/**
 * YouTube Service V2のファクトリー関数
 */
export function createVideoService(apiKey?: string): VideoService {
	const key = apiKey || process.env.YOUTUBE_API_KEY;
	if (!key) {
		throw new Error("YouTube API key is required");
	}

	return new YouTubeService(key);
}

/**
 * YouTube APIのレスポンスをVideoエンティティに変換
 *
 * @deprecated この関数はvideo-mapper.tsに移動しました
 */
export function mapYouTubeVideoToEntity(video: youtube_v3.Schema$Video): Video | null {
	return mapYouTubeToVideoEntity(video);
}
