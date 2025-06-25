/**
 * Firestore サーバーサイド向けのユーティリティ関数
 * Cloud Functions や サーバーサイド実装で使用
 */

import type { FirestoreServerVideoData, LiveBroadcastContent, VideoType } from "./video";

/**
 * クライアント用のFirestoreVideoDataからサーバーサイド用のデータに変換
 * この関数はサーバーサイド(Cloud Functions)でのみ使用すること
 *
 * @param data クライアント用のデータ
 * @param firestore Firebase Admin Firestoreインスタンス
 * @returns サーバーサイド用のFirestoreデータ
 */
export function toServerModel(
	data: Record<string, unknown>,
	firestore: { Timestamp: { now(): unknown; fromDate(date: Date): unknown } },
): FirestoreServerVideoData {
	// Firestoreのタイムスタンプに変換
	// Admin SDKを使用
	const toTimestamp = (dateString: unknown) => {
		if (!dateString) {
			return firestore.Timestamp.now();
		}
		try {
			return firestore.Timestamp.fromDate(new Date(String(dateString)));
		} catch (_e) {
			return firestore.Timestamp.now();
		}
	};

	return {
		id: data.id as string | undefined,
		videoId: (data.videoId as string) || (data.id as string),
		title: data.title as string,
		description: (data.description as string) || "",
		channelId: data.channelId as string,
		channelTitle: data.channelTitle as string,
		publishedAt: toTimestamp(data.publishedAt),
		thumbnailUrl: data.thumbnailUrl as string,
		lastFetchedAt: toTimestamp(data.lastFetchedAt),
		videoType: data.videoType as VideoType | undefined,
		liveBroadcastContent: data.liveBroadcastContent as LiveBroadcastContent | undefined,
	};
}

/**
 * サーバーサイド(Firestore)のデータからクライアント用のデータに変換
 *
 * @param data サーバーサイドのデータ
 * @returns クライアント用のデータ
 */
export function fromServerModel(data: FirestoreServerVideoData): Record<string, unknown> {
	// タイムスタンプをISO文字列に変換
	const toISOString = (timestamp: unknown) => {
		if (!timestamp) {
			return new Date().toISOString();
		}
		try {
			// Firestoreのタイムスタンプからの変換
			if (
				timestamp &&
				typeof timestamp === "object" &&
				"toDate" in timestamp &&
				typeof timestamp.toDate === "function"
			) {
				return timestamp.toDate().toISOString();
			}
			return new Date(timestamp as Date | string | number).toISOString();
		} catch (_e) {
			return new Date().toISOString();
		}
	};

	return {
		id: data.id || data.videoId, // id または videoId のどちらかを使用
		videoId: data.videoId,
		title: data.title,
		description: data.description || "",
		channelId: data.channelId,
		channelTitle: data.channelTitle,
		publishedAt: toISOString(data.publishedAt),
		thumbnailUrl: data.thumbnailUrl,
		lastFetchedAt: toISOString(data.lastFetchedAt),
		videoType: data.videoType,
		liveBroadcastContent: data.liveBroadcastContent || "none",
	};
}
