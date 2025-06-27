"use server";

/**
 * Server Actions for fetching video data from Firestore
 */

import {
	type CollectionReference,
	type DocumentSnapshot,
	Timestamp,
} from "@google-cloud/firestore";
import {
	convertToFrontendVideo,
	type FirestoreServerVideoData,
	type FrontendVideoData,
	type VideoListResult,
} from "@suzumina.click/shared-types/src/video";
import { getFirestore } from "@/lib/firestore";

/**
 * ページネーション用のクエリを構築する関数
 */
function buildPaginationQuery(
	videosRef: CollectionReference,
	params?: {
		page?: number;
		limit?: number;
		startAfterDocId?: string;
	},
) {
	const limit = params?.limit || 100;
	const page = params?.page || 1;
	let query = videosRef.orderBy("publishedAt", "desc");

	if (params?.startAfterDocId) {
		return { query, limit, useStartAfter: true, docId: params.startAfterDocId };
	}

	if (page > 1) {
		const offset = (page - 1) * limit;
		query = query.offset(offset);
	}

	return { query, limit, useStartAfter: false };
}

/**
 * Timestamp型をISO文字列に変換する関数
 */
function convertTimestamp(timestamp: unknown): string {
	return timestamp instanceof Timestamp
		? timestamp.toDate().toISOString()
		: new Date().toISOString();
}

/**
 * FirestoreサーバーデータをFirestoreデータ形式に変換する関数
 */
function convertServerDataToFirestoreData(doc: DocumentSnapshot, data: FirestoreServerVideoData) {
	return {
		id: doc.id,
		videoId: data.videoId || doc.id,
		title: data.title,
		description: data.description || "",
		channelId: data.channelId,
		channelTitle: data.channelTitle,
		publishedAt: convertTimestamp(data.publishedAt),
		thumbnailUrl: data.thumbnailUrl || "",
		lastFetchedAt: convertTimestamp(data.lastFetchedAt),
		videoType: data.videoType,
		liveBroadcastContent: data.liveBroadcastContent,
		audioButtonCount: data.audioButtonCount || 0,
		hasAudioButtons: data.hasAudioButtons || false,
	};
}

/**
 * ドキュメントリストを処理してフロントエンド用動画データに変換する関数
 */
function processVideoDocuments(docs: DocumentSnapshot[], limit: number): FrontendVideoData[] {
	const videos: FrontendVideoData[] = [];
	const videosToProcess = docs.slice(0, limit);

	for (const doc of videosToProcess) {
		try {
			const data = doc.data() as FirestoreServerVideoData;
			const firestoreData = convertServerDataToFirestoreData(doc, data);
			const frontendVideo = convertToFrontendVideo(firestoreData);
			videos.push(frontendVideo);
		} catch (_error) {
			// 変換エラーは無視して次の動画を処理
		}
	}

	return videos;
}

/**
 * Firestoreからビデオタイトル一覧を取得するServer Action（ページネーション対応）
 */
export async function getVideoTitles(params?: {
	page?: number;
	limit?: number;
	startAfterDocId?: string;
}): Promise<VideoListResult> {
	try {
		const firestore = getFirestore();
		const videosRef = firestore.collection("videos");
		const paginationConfig = buildPaginationQuery(videosRef, params);

		// startAfter処理
		if (paginationConfig.useStartAfter && paginationConfig.docId) {
			const startAfterDoc = await videosRef.doc(paginationConfig.docId).get();
			if (startAfterDoc.exists) {
				paginationConfig.query = paginationConfig.query.startAfter(startAfterDoc);
			}
		}

		// limit+1を取得して、次のページがあるかどうかを判定
		const snapshot = await paginationConfig.query.limit(paginationConfig.limit + 1).get();

		if (snapshot.empty) {
			return { videos: [], hasMore: false };
		}

		const docs = snapshot.docs;
		const videos = processVideoDocuments(docs, paginationConfig.limit);

		// 次のページがあるかどうかを判定
		const hasMore = docs.length > paginationConfig.limit;
		const lastVideo = videos.length > 0 ? videos[videos.length - 1] : undefined;

		return {
			videos,
			hasMore,
			lastVideo,
		};
	} catch (_error) {
		return { videos: [], hasMore: false };
	}
}

/**
 * 総動画数を取得するServer Action
 */
export async function getTotalVideoCount(): Promise<number> {
	try {
		const firestore = getFirestore();
		const videosRef = firestore.collection("videos");
		const countSnapshot = await videosRef.count().get();
		return countSnapshot.data().count;
	} catch (_error) {
		return 0;
	}
}

/**
 * 特定の動画IDで動画データを取得するServer Action
 * @param videoId - 動画ID
 * @returns 動画データまたはnull
 */
export async function getVideoById(videoId: string): Promise<FrontendVideoData | null> {
	try {
		const firestore = getFirestore();
		const doc = await firestore.collection("videos").doc(videoId).get();

		if (!doc.exists) {
			return null;
		}

		const data = doc.data() as FirestoreServerVideoData;

		// Timestamp型をISO文字列に変換
		const publishedAt =
			data.publishedAt instanceof Timestamp
				? data.publishedAt.toDate().toISOString()
				: new Date().toISOString();

		const lastFetchedAt =
			data.lastFetchedAt instanceof Timestamp
				? data.lastFetchedAt.toDate().toISOString()
				: new Date().toISOString();

		// FirestoreVideoData形式に変換
		const firestoreData = {
			id: doc.id,
			videoId: data.videoId || doc.id,
			title: data.title,
			description: data.description || "",
			channelId: data.channelId,
			channelTitle: data.channelTitle,
			publishedAt,
			thumbnailUrl: data.thumbnailUrl || "",
			lastFetchedAt,
			videoType: data.videoType,
			liveBroadcastContent: data.liveBroadcastContent,
			audioButtonCount: data.audioButtonCount || 0,
			hasAudioButtons: data.hasAudioButtons || false,
		};

		// フロントエンド用に変換
		const frontendVideo = convertToFrontendVideo(firestoreData);

		return frontendVideo;
	} catch (_error) {
		return null;
	}
}
