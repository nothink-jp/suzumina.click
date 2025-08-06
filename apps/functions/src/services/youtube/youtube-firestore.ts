/**
 * YouTube Firestore Service
 *
 * Entity 形式でFirestoreに動画データを保存する
 * 新規データには_v2Migrationフラグを自動付与
 */

import type { FirestoreServerVideoData } from "@suzumina.click/shared-types";
import type { youtube_v3 } from "googleapis";
import firestore from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";
import { VideoMapper } from "../mappers/video-mapper";

// Firestore関連の定数
const VIDEOS_COLLECTION = "videos";
const MAX_FIRESTORE_BATCH_SIZE = 500; // Firestoreのバッチ書き込み上限

/**
 * Entity 形式でYouTube動画をFirestoreに保存
 *
 * @param videos - YouTube APIから取得した動画の配列
 * @returns 保存に成功した動画数
 */
export async function saveVideosToFirestore(videos: youtube_v3.Schema$Video[]): Promise<number> {
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

		const channelVideos = videosByChannel.get(channelId) || [];
		channelVideos.push(video);
		videosByChannel.set(channelId, channelVideos);
	}

	// Entity 形式で動画を保存開始

	let totalSaved = 0;

	// チャンネル別に処理
	for (const [channelId, channelVideos] of videosByChannel) {
		const result = await saveChannelVideos(channelId, channelVideos);
		totalSaved += result.savedCount;
	}

	// 保存に失敗した場合のみログを出力
	if (totalSaved < videos.length) {
		logger.warn("一部の動画保存に失敗", {
			total: videos.length,
			saved: totalSaved,
			failed: videos.length - totalSaved,
		});
	}

	return totalSaved;
}

/**
 * チャンネル別に動画を保存（Entity 形式）
 */
async function saveChannelVideos(
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
					logger.warn("動画IDがありません", { videoId: video.id });
					continue;
				}

				// Entity に変換
				const videoEntity = VideoMapper.fromYouTubeAPI(video);
				if (!videoEntity) {
					// Entity 変換失敗（ログはエラーハンドリングで出力済み）
					continue;
				}

				// Firestore用データに変換
				const firestoreData = videoEntity.toFirestore();

				// 動画IDをドキュメントIDとして使用
				const docRef = videoRef.doc(video.id);
				batch.set(docRef, firestoreData, { merge: true });
				batchCount++;
			} catch (error) {
				logger.error("動画のEntity変換に失敗", {
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
				// バッチ保存完了
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
 * 既存の動画データをEntity 形式で更新
 *
 * @param existingData - 既存のFirestoreデータ
 * @param newVideo - YouTube APIから取得した新しい動画データ
 * @returns 更新されたFirestoreデータ
 */
export function updateVideoWith(
	_existingData: FirestoreServerVideoData,
	newVideo: youtube_v3.Schema$Video,
): FirestoreServerVideoData | null {
	try {
		// Entity に変換
		const videoEntity = VideoMapper.fromYouTubeAPI(newVideo);
		if (!videoEntity) {
			return null;
		}

		// Firestore用データに変換
		return videoEntity.toFirestore();
	} catch (error) {
		logger.error("Entity 更新エラー", {
			videoId: newVideo.id,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}
