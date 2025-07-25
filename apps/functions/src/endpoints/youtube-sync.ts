/**
 * YouTube Sync V2 Endpoint
 *
 * Cloud Functions endpoint for YouTube video synchronization using the new
 * Video Entity architecture. This endpoint gradually migrates data to the
 * new format while maintaining backward compatibility.
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import type { Video } from "@suzumina.click/shared-types";
import firestore, { Timestamp } from "../infrastructure/database/firestore";
import { createVideoService, type VideoService } from "../services/youtube/youtube-service";
import * as logger from "../shared/logger";

// Firestore関連の定数
const METADATA_COLLECTION = "youtubeMetadata";
const METADATA_DOC_ID = "fetch_metadata_v2";
const VIDEOS_COLLECTION = "videos";

// 実行制限関連の定数
const MAX_PAGES_PER_EXECUTION = 3; // 1回の実行での最大ページ数
const MAX_VIDEOS_PER_BATCH = 50; // バッチごとの最大動画数

// メタデータの型定義
interface FetchMetadataV2 {
	lastFetchedAt: Timestamp;
	nextPageToken?: string;
	isInProgress: boolean;
	lastError?: string;
	lastSuccessfulCompleteFetch?: Timestamp;
	version: "v2"; // V2であることを示すマーカー
}

/**
 * 処理結果の型定義
 */
interface FetchResultV2 {
	videoCount: number;
	migratedCount: number;
	error?: string;
}

/**
 * メタデータを取得
 */
async function getMetadata(): Promise<FetchMetadataV2 | null> {
	try {
		const doc = await firestore.collection(METADATA_COLLECTION).doc(METADATA_DOC_ID).get();
		return doc.exists ? (doc.data() as FetchMetadataV2) : null;
	} catch (error) {
		logger.error("メタデータの取得に失敗しました:", error);
		return null;
	}
}

/**
 * メタデータを更新
 */
async function updateMetadata(updates: Partial<FetchMetadataV2>): Promise<void> {
	await firestore
		.collection(METADATA_COLLECTION)
		.doc(METADATA_DOC_ID)
		.set(
			{
				...updates,
				version: "v2",
			},
			{ merge: true },
		);
}

/**
 * 動画をバッチで保存（V2形式）
 */
async function saveVideosV2Batch(videos: Video[]): Promise<{ saved: number; migrated: number }> {
	if (videos.length === 0) {
		return { saved: 0, migrated: 0 };
	}

	const batch = firestore.batch();
	let saved = 0;
	let migrated = 0;

	for (const video of videos) {
		const videoRef = firestore.collection(VIDEOS_COLLECTION).doc(video.id);

		// 既存のデータを取得してマージ
		const existingDoc = await videoRef.get();
		const existingData = existingDoc.exists ? existingDoc.data() : {};

		// V2形式のデータをFirestore形式に変換して保存
		const firestoreData = video.toFirestore();
		const mergedData = {
			...existingData,
			...firestoreData,
			// V2マイグレーション情報を追加
			_v2Migration: {
				migratedAt: Timestamp.now(),
				version: "2.0.0",
			},
		};

		batch.set(videoRef, mergedData, { merge: true });
		saved++;

		if (existingData && !existingData._v2Migration) {
			migrated++;
		}
	}

	await batch.commit();
	return { saved, migrated };
}

/**
 * YouTube動画を取得して保存（V2版）
 */
async function fetchAndSaveVideosV2(
	service: VideoService,
	channelId: string,
	pageToken?: string,
): Promise<FetchResultV2> {
	let totalVideoCount = 0;
	let totalMigratedCount = 0;
	let currentPageToken = pageToken;
	let pagesProcessed = 0;

	try {
		// メタデータの更新（処理開始）
		await updateMetadata({
			isInProgress: true,
			lastFetchedAt: Timestamp.now(),
		});

		while (pagesProcessed < MAX_PAGES_PER_EXECUTION) {
			// ページ処理開始（ログは削除）

			// チャンネルの動画を取得
			const { videos, nextPageToken } = await service.fetchChannelVideos(
				channelId,
				MAX_VIDEOS_PER_BATCH,
				currentPageToken,
			);

			if (videos.length === 0) {
				break;
			}

			// バッチで保存
			const { saved, migrated } = await saveVideosV2Batch(videos);
			totalVideoCount += saved;
			totalMigratedCount += migrated;

			// 保存完了（詳細ログは削除）

			// 次のページがない場合は終了
			if (!nextPageToken) {
				await updateMetadata({
					nextPageToken: undefined,
					lastSuccessfulCompleteFetch: Timestamp.now(),
				});
				break;
			}

			currentPageToken = nextPageToken;
			pagesProcessed++;

			// ページ制限に達した場合
			if (pagesProcessed >= MAX_PAGES_PER_EXECUTION) {
				await updateMetadata({
					nextPageToken: currentPageToken,
				});
			}
		}

		// メタデータの更新（処理完了）
		await updateMetadata({
			isInProgress: false,
			lastError: undefined,
		});

		return {
			videoCount: totalVideoCount,
			migratedCount: totalMigratedCount,
		};
	} catch (error) {
		logger.error("動画の取得中にエラーが発生しました:", error);

		// エラー情報を保存
		await updateMetadata({
			isInProgress: false,
			lastError: error instanceof Error ? error.message : "Unknown error",
			nextPageToken: currentPageToken, // エラー時は現在のページトークンを保持
		});

		return {
			videoCount: totalVideoCount,
			migratedCount: totalMigratedCount,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * YouTube動画同期のメイン関数（V2版）
 */
export async function youtubeSyncV2(event: CloudEvent<unknown>): Promise<void> {
	// YouTube同期V2開始

	try {
		// メタデータを取得
		const metadata = await getMetadata();

		// 別のインスタンスが実行中の場合はスキップ
		if (metadata?.isInProgress) {
			return;
		}

		// サービスの初期化
		const service = createVideoService();

		// チャンネルIDの取得（環境変数から）
		const channelId = process.env.SUZUKA_MINASE_CHANNEL_ID;
		if (!channelId) {
			throw new Error("チャンネルIDが設定されていません");
		}

		// 動画の取得と保存
		const result = await fetchAndSaveVideosV2(service, channelId, metadata?.nextPageToken);

		// 完了時のみサマリーログを出力
		if (result.videoCount > 0 || result.error) {
			logger.info("YouTube同期V2完了", {
				saved: result.videoCount,
				migrated: result.migratedCount,
				...(result.error && { error: result.error }),
			});
		}

		// エラーがあった場合はステータスコードを設定
		if (result.error) {
			throw new Error(result.error);
		}
	} catch (error) {
		logger.error("YouTube同期V2でエラーが発生しました:", error);
		throw error; // Cloud Functionsのリトライ機能を活用
	}
}
