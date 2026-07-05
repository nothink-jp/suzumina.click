/**
 * YouTube Firestore Service
 *
 * VideoPlainObject形式でFirestoreに動画データを保存する
 * 新規データには_v2Migrationフラグを自動付与
 */

import { videoToFirestore } from "@suzumina.click/shared-types";
import type { youtube_v3 } from "googleapis";
import firestore from "../../infrastructure/database/firestore";
import { SUZUKA_MINASE_CHANNEL_ID } from "../../shared/common";
import * as logger from "../../shared/logger";
import { VideoMapper } from "../mappers/video-mapper";

// Firestore関連の定数
const VIDEOS_COLLECTION = "videos";
const MAX_FIRESTORE_BATCH_SIZE = 500; // Firestoreのバッチ書き込み上限

/** videoIdバルク存在確認（getAll）を分割するチャンクサイズ */
const KNOWN_VIDEO_IDS_CHUNK_SIZE = 300;

/**
 * 指定した動画IDのうち、Firestoreに既に存在する（=既知の）IDの集合を返す
 *
 * SPR-230: uploads playlistは新着順なので、ページ内の動画IDがこの集合に
 * 含まれていれば「既に発見済みの旧動画」と判定できる（incremental discoveryの
 * early-stop判定に使う）。`videos`コレクションはdoc ID=video.idのため、
 * DLsiteの`getExistingWorksMap`（productIdフィールドでの`in`クエリ）と違い
 * `firestore.getAll(...refs)`によるバルク直接取得がそのまま使える。
 *
 * @param videoIds 確認対象の動画ID
 * @returns 既にFirestoreに存在する動画IDの集合
 */
export async function getKnownVideoIdsSet(videoIds: string[]): Promise<Set<string>> {
	const knownIds = new Set<string>();
	if (videoIds.length === 0) {
		return knownIds;
	}

	const refs = videoIds.map((id) => firestore.collection(VIDEOS_COLLECTION).doc(id));
	const chunks: FirebaseFirestore.DocumentReference[][] = [];
	for (let i = 0; i < refs.length; i += KNOWN_VIDEO_IDS_CHUNK_SIZE) {
		chunks.push(refs.slice(i, i + KNOWN_VIDEO_IDS_CHUNK_SIZE));
	}

	const chunkResults = await Promise.all(chunks.map((chunk) => firestore.getAll(...chunk)));

	for (const docs of chunkResults) {
		for (const doc of docs) {
			if (doc.exists) {
				knownIds.add(doc.id);
			}
		}
	}

	return knownIds;
}

/**
 * Firestoreに保存されている全動画IDの集合を返す（`videos`コレクション全件のID一覧）
 *
 * SPR-230: 週次フルスイープでの取りこぼし検知（uploads playlist全走査で見つからなかった
 * 既知動画IDが無いか）に使う。`select()`でフィールド取得を省きID一覧のみを取得することで
 * 読み取りコストを抑える。対象は~550件程度の小規模コレクションのため全件取得で十分。
 *
 * @returns Firestoreに存在する全動画IDの集合
 */
export async function getAllVideoIds(): Promise<Set<string>> {
	const snapshot = await firestore.collection(VIDEOS_COLLECTION).select().get();
	return new Set(snapshot.docs.map((doc) => doc.id));
}

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
