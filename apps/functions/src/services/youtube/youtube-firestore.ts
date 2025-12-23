/**
 * YouTube Firestore Service
 *
 * VideoPlainObject形式でFirestoreに動画データを保存する
 * 新規データには_v2Migrationフラグを自動付与
 */

import type { FirestoreServerVideoData } from "@suzumina.click/shared-types";
import { videoToFirestore } from "@suzumina.click/shared-types";
import type { youtube_v3 } from "googleapis";
import firestore from "../../infrastructure/database/firestore";
import { SUZUKA_MINASE_CHANNEL_ID } from "../../shared/common";
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

	// 許可されたチャンネルIDの動画のみをフィルタリング
	const filteredVideos: youtube_v3.Schema$Video[] = [];
	let skippedCount = 0;

	for (const video of videos) {
		const channelId = video.snippet?.channelId;
		if (!channelId) {
			logger.warn("動画にチャンネルIDがありません", { videoId: video.id });
			skippedCount++;
			continue;
		}

		// 許可されたチャンネルIDかチェック
		if (channelId !== SUZUKA_MINASE_CHANNEL_ID) {
			logger.warn("許可されていないチャンネルの動画をスキップしました", {
				videoId: video.id,
				videoTitle: video.snippet?.title,
				channelId,
				expectedChannelId: SUZUKA_MINASE_CHANNEL_ID,
			});
			skippedCount++;
			continue;
		}

		filteredVideos.push(video);
	}

	if (skippedCount > 0) {
		logger.info(
			`チャンネルIDフィルタリング完了: ${filteredVideos.length}件保存対象、${skippedCount}件スキップ`,
		);
	}

	if (filteredVideos.length === 0) {
		logger.warn("保存対象の動画がありません（すべてフィルタリングされました）");
		return 0;
	}

	// チャンネルIDでグループ化（フィルタリング済みなので基本的に1チャンネルのみ）
	const videosByChannel = new Map<string, youtube_v3.Schema$Video[]>();
	for (const video of filteredVideos) {
		const channelId = video.snippet?.channelId;
		if (!channelId) {
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
	if (totalSaved < filteredVideos.length) {
		logger.warn("一部の動画保存に失敗", {
			total: filteredVideos.length,
			saved: totalSaved,
			failed: filteredVideos.length - totalSaved,
		});
	}

	return totalSaved;
}

/**
 * 動画をFirestoreバッチに追加
 */
function addVideoToBatch(
	video: youtube_v3.Schema$Video & { _playlistTags?: string[] },
	batch: FirebaseFirestore.WriteBatch,
	videoRef: FirebaseFirestore.CollectionReference,
): boolean {
	if (!video.id) {
		logger.warn("動画IDがありません", { videoId: video.id });
		return false;
	}

	// プレイリストタグを抽出
	const playlistTags = video._playlistTags || [];

	// VideoPlainObjectに変換（プレイリストタグも渡す）
	const videoPlainObject = VideoMapper.fromYouTubeAPIWithTags(video, playlistTags);
	if (!videoPlainObject) {
		// 変換失敗（ログはエラーハンドリングで出力済み）
		return false;
	}

	// Firestore用データに変換
	const firestoreData = videoToFirestore(videoPlainObject);

	// 動画IDをドキュメントIDとして使用
	const docRef = videoRef.doc(video.id);
	batch.set(docRef, firestoreData, { merge: true });
	return true;
}

/**
 * バッチ単位で動画を保存
 */
async function saveBatchVideos(
	batchVideos: youtube_v3.Schema$Video[],
	videoRef: FirebaseFirestore.CollectionReference,
	channelId: string,
	batchNumber: number,
): Promise<number> {
	const batch = firestore.batch();
	let batchCount = 0;

	for (const video of batchVideos) {
		try {
			if (addVideoToBatch(video, batch, videoRef)) {
				batchCount++;
			}
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
			return batchCount;
		} catch (error) {
			logger.error("バッチ保存エラー", {
				channelId,
				batchNumber,
				error: error instanceof Error ? error.message : String(error),
			});
			return 0;
		}
	}

	return 0;
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
		const batchNumber = Math.floor(i / MAX_FIRESTORE_BATCH_SIZE) + 1;
		const batchSavedCount = await saveBatchVideos(batchVideos, videoRef, channelId, batchNumber);
		savedCount += batchSavedCount;
	}

	return { savedCount };
}

/**
 * 許可されていないチャンネルの動画をFirestoreから削除
 * （スパム動画のクリーンアップ用）
 *
 * @returns 削除された動画数と削除された動画のID一覧
 */
export async function deleteUnauthorizedChannelVideos(): Promise<{
	deletedCount: number;
	deletedVideoIds: string[];
}> {
	const videoRef = firestore.collection(VIDEOS_COLLECTION);
	const deletedVideoIds: string[] = [];

	// 全動画を取得してチャンネルIDをチェック
	const snapshot = await videoRef.get();

	if (snapshot.empty) {
		logger.info("動画コレクションは空です");
		return { deletedCount: 0, deletedVideoIds: [] };
	}

	// 削除対象の動画を収集
	const videosToDelete: { id: string; channelId: string; title?: string }[] = [];

	for (const doc of snapshot.docs) {
		const data = doc.data();
		const channelId = data.channelId as string | undefined;

		if (!channelId || channelId !== SUZUKA_MINASE_CHANNEL_ID) {
			videosToDelete.push({
				id: doc.id,
				channelId: channelId || "undefined",
				title: data.title as string | undefined,
			});
		}
	}

	if (videosToDelete.length === 0) {
		logger.info("削除対象の動画はありません");
		return { deletedCount: 0, deletedVideoIds: [] };
	}

	logger.info(`削除対象の動画を${videosToDelete.length}件発見しました`, {
		videos: videosToDelete.map((v) => ({
			id: v.id,
			channelId: v.channelId,
			title: v.title?.substring(0, 50),
		})),
	});

	// バッチ削除（Firestoreバッチサイズ制限を考慮）
	for (let i = 0; i < videosToDelete.length; i += MAX_FIRESTORE_BATCH_SIZE) {
		const batchVideos = videosToDelete.slice(i, i + MAX_FIRESTORE_BATCH_SIZE);
		const batch = firestore.batch();

		for (const video of batchVideos) {
			const docRef = videoRef.doc(video.id);
			batch.delete(docRef);
			deletedVideoIds.push(video.id);
		}

		try {
			await batch.commit();
			logger.info(
				`バッチ削除完了: ${batchVideos.length}件 (${i + 1}-${i + batchVideos.length}/${videosToDelete.length})`,
			);
		} catch (error) {
			logger.error("バッチ削除エラー", {
				batchStart: i,
				batchSize: batchVideos.length,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	logger.info(`不正チャンネル動画の削除完了: ${deletedVideoIds.length}件削除`);

	return {
		deletedCount: deletedVideoIds.length,
		deletedVideoIds,
	};
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
		// VideoPlainObjectに変換
		const videoPlainObject = VideoMapper.fromYouTubeAPI(newVideo);
		if (!videoPlainObject) {
			return null;
		}

		// Firestore用データに変換
		return videoToFirestore(videoPlainObject);
	} catch (error) {
		logger.error("動画更新エラー", {
			videoId: newVideo.id,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}
