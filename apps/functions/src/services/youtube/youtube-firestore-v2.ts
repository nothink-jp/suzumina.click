/**
 * YouTube Firestore Service V2
 *
 * Entity V2形式でFirestoreに動画データを保存する
 * 新規データには_v2Migrationフラグを自動付与
 */

import type { FirestoreServerVideoData } from "@suzumina.click/shared-types";
import type { youtube_v3 } from "googleapis";
import firestore, { Timestamp } from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";
import { VideoMapperV2 } from "../mappers/video-mapper-v2";

// Firestore関連の定数
const VIDEOS_COLLECTION = "videos";
const MAX_FIRESTORE_BATCH_SIZE = 500; // Firestoreのバッチ書き込み上限

/**
 * Entity V2形式でYouTube動画をFirestoreに保存
 *
 * @param videos - YouTube APIから取得した動画の配列
 * @returns 保存に成功した動画数
 */
export async function saveVideosToFirestoreV2(videos: youtube_v3.Schema$Video[]): Promise<number> {
	if (videos.length === 0) {
		return 0;
	}

	// チャンネルIDでグループ化
	const videosByChannel = new Map<string, youtube_v3.Schema$Video[]>();
	for (const video of videos) {
		const channelId = video.snippet?.channelId;
		if (!channelId) {
			logger.warn("動画にチャンネルIDがありません", { videoId: video.id });
			continue;
		}

		if (!videosByChannel.has(channelId)) {
			videosByChannel.set(channelId, []);
		}
		videosByChannel.get(channelId)!.push(video);
	}

	logger.info("Entity V2形式で動画を保存開始", {
		totalVideos: videos.length,
		channelCount: videosByChannel.size,
	});

	let totalSaved = 0;

	// チャンネル別に処理
	for (const [channelId, channelVideos] of videosByChannel) {
		const result = await saveChannelVideosV2(channelId, channelVideos);
		totalSaved += result.savedCount;
	}

	logger.info("Entity V2形式での動画保存完了", {
		totalVideos: videos.length,
		totalSaved,
		failedCount: videos.length - totalSaved,
	});

	return totalSaved;
}

/**
 * チャンネル別に動画を保存（Entity V2形式）
 */
async function saveChannelVideosV2(
	channelId: string,
	videos: youtube_v3.Schema$Video[],
): Promise<{ savedCount: number }> {
	const videoRef = firestore.collection(VIDEOS_COLLECTION);
	let savedCount = 0;

	// バッチサイズごとに分割して処理
	for (let i = 0; i < videos.length; i += MAX_FIRESTORE_BATCH_SIZE) {
		const batchVideos = videos.slice(i, i + MAX_FIRESTORE_BATCH_SIZE);
		const batch = firestore.batch();
		let batchCount = 0;

		for (const video of batchVideos) {
			try {
				if (!video.id) {
					logger.warn("動画IDがありません", { video });
					continue;
				}

				// Entity V2に変換
				const videoEntity = VideoMapperV2.fromYouTubeAPI(video);
				if (!videoEntity) {
					logger.warn("Entity V2変換に失敗", { videoId: video.id });
					continue;
				}

				// レガシー形式に変換（後方互換性のため）
				const legacyData = videoEntity.toLegacyFormat();

				// Firestore用データに変換し、V2フラグを追加
				const firestoreData: FirestoreServerVideoData = {
					...legacyData,
					_v2Migration: {
						migratedAt: Timestamp.now(),
						source: "cloud_functions",
						version: "2.0.0",
					},
					updatedAt: Timestamp.now(),
				};

				// 動画IDをドキュメントIDとして使用
				const docRef = videoRef.doc(video.id);
				batch.set(docRef, firestoreData, { merge: true });
				batchCount++;
			} catch (error) {
				logger.error("Entity V2変換エラー", {
					videoId: video.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// バッチをコミット
		if (batchCount > 0) {
			try {
				await batch.commit();
				savedCount += batchCount;
				logger.info("バッチ保存完了", {
					channelId,
					batchNumber: Math.floor(i / MAX_FIRESTORE_BATCH_SIZE) + 1,
					savedInBatch: batchCount,
				});
			} catch (error) {
				logger.error("バッチ保存エラー", {
					channelId,
					batchNumber: Math.floor(i / MAX_FIRESTORE_BATCH_SIZE) + 1,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	return { savedCount };
}

/**
 * 既存の動画データをEntity V2形式で更新
 *
 * @param existingData - 既存のFirestoreデータ
 * @param newVideo - YouTube APIから取得した新しい動画データ
 * @returns 更新されたFirestoreデータ
 */
export function updateVideoWithV2(
	existingData: FirestoreServerVideoData,
	newVideo: youtube_v3.Schema$Video,
): FirestoreServerVideoData | null {
	try {
		// Entity V2に変換
		const videoEntity = VideoMapperV2.fromYouTubeAPI(newVideo);
		if (!videoEntity) {
			return null;
		}

		// レガシー形式に変換して既存データと統合
		const legacyData = videoEntity.toLegacyFormat();

		return {
			...existingData,
			...legacyData,
			_v2Migration: {
				migratedAt: Timestamp.now(),
				source: "cloud_functions_update",
				version: "2.0.0",
			},
			updatedAt: Timestamp.now(),
		};
	} catch (error) {
		logger.error("Entity V2更新エラー", {
			videoId: newVideo.id,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}
