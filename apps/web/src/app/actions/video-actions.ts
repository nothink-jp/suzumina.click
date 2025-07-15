"use server";

import { FieldValue } from "@google-cloud/firestore";
import {
	convertToFrontendVideo,
	type FirestoreServerVideoData,
	type FirestoreVideoData,
	type FrontendVideoData,
	type VideoListResult,
} from "@suzumina.click/shared-types/src/video";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/components/system/protected-route";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

/**
 * Firestore Timestampを安全にISO文字列に変換するヘルパー関数
 */
function convertTimestampToISO(timestamp: unknown): string {
	if (timestamp instanceof Date) {
		return timestamp.toISOString();
	}
	if (typeof timestamp === "object" && timestamp && "toDate" in timestamp) {
		return (timestamp as { toDate(): Date }).toDate().toISOString();
	}
	return new Date().toISOString();
}

/**
 * FirestoreServerVideoDataをFirestoreVideoDataに変換するヘルパー関数
 */
function convertFirestoreServerData(
	doc: { id: string },
	docData: FirestoreServerVideoData,
): FirestoreVideoData {
	return {
		id: doc.id,
		videoId: docData.videoId || doc.id,
		title: docData.title,
		description: docData.description || "",
		channelId: docData.channelId,
		channelTitle: docData.channelTitle,
		publishedAt: convertTimestampToISO(docData.publishedAt),
		thumbnailUrl: docData.thumbnailUrl || "",
		lastFetchedAt: convertTimestampToISO(docData.lastFetchedAt),
		videoType: docData.videoType,
		liveBroadcastContent: docData.liveBroadcastContent,
		audioButtonCount: docData.audioButtonCount || 0,
		hasAudioButtons: docData.hasAudioButtons || false,
	};
}

/**
 * 管理者用動画一覧取得のクエリ構築ヘルパー関数
 */
function buildVideoQuery(
	videosRef: FirebaseFirestore.CollectionReference,
	params?: { year?: string; sort?: string },
) {
	let query = videosRef.orderBy("publishedAt", params?.sort === "oldest" ? "asc" : "desc");

	// 年代フィルタリング
	if (params?.year) {
		const year = Number.parseInt(params.year, 10);
		if (!Number.isNaN(year)) {
			const startOfYear = new Date(year, 0, 1);
			const endOfYear = new Date(year + 1, 0, 1);
			query = query.where("publishedAt", ">=", startOfYear).where("publishedAt", "<", endOfYear);
		}
	}

	return query;
}

/**
 * 検索フィルタリングヘルパー関数
 */
function matchesSearchFilter(title: string, search?: string): boolean {
	if (!search) return true;

	const searchLower = search.toLowerCase();
	const titleLower = title.toLowerCase();
	return titleLower.includes(searchLower);
}

/**
 * 管理者権限チェックヘルパー関数
 */
async function checkAdminPermission(): Promise<
	{ success: true } | { success: false; error: string }
> {
	const user = await requireAuth();
	if (user.role !== "admin") {
		return {
			success: false,
			error: "この操作には管理者権限が必要です",
		};
	}
	return { success: true };
}

/**
 * 空のビデオリスト結果を返すヘルパー関数
 */
function createEmptyVideoListResult(): { success: true; data: VideoListResult } {
	return {
		success: true,
		data: { videos: [], hasMore: false },
	};
}

/**
 * 動画ドキュメントをフロントエンド用データに変換するヘルパー関数
 */
function processVideoDocuments(
	videoDocs: FirebaseFirestore.QueryDocumentSnapshot[],
	searchFilter?: string,
): FrontendVideoData[] {
	const videos: FrontendVideoData[] = [];

	for (const doc of videoDocs) {
		try {
			const data = doc.data() as FirestoreServerVideoData;

			// 検索フィルタリング
			if (!matchesSearchFilter(data.title, searchFilter)) {
				continue;
			}

			// Firestore server data を標準的な形式に変換
			const firestoreData = convertFirestoreServerData(doc, data);

			// フロントエンド表示用データに変換
			const frontendVideo = convertToFrontendVideo(firestoreData);
			videos.push(frontendVideo);
		} catch (conversionError) {
			logger.warn("動画データ変換エラー", {
				docId: doc.id,
				error: conversionError instanceof Error ? conversionError.message : String(conversionError),
			});
			// 変換エラーは無視して次の動画を処理
		}
	}

	return videos;
}

/**
 * 管理者用：動画情報を更新するServer Action
 */
export async function updateVideo(
	videoId: string,
	input: {
		title?: string;
		description?: string;
		tags?: string[];
	},
): Promise<{ success: true; data: { message: string } } | { success: false; error: string }> {
	try {
		logger.info("動画情報更新を開始", { videoId });

		// 認証チェック（管理者権限必須）
		const user = await requireAuth();
		if (user.role !== "admin") {
			logger.warn("管理者権限が必要", { userId: user.discordId, videoId });
			return {
				success: false,
				error: "この操作には管理者権限が必要です",
			};
		}

		if (!videoId || typeof videoId !== "string") {
			return {
				success: false,
				error: "動画IDが指定されていません",
			};
		}

		const firestore = getFirestore();
		const videoRef = firestore.collection("videos").doc(videoId);

		// 動画の存在確認
		const videoDoc = await videoRef.get();
		if (!videoDoc.exists) {
			return {
				success: false,
				error: "指定された動画が見つかりません",
			};
		}

		// 更新データの構築
		const updateData: Record<string, unknown> = {
			lastUpdated: new Date().toISOString(),
		};

		if (input.title !== undefined) {
			updateData.title = input.title;
		}
		if (input.description !== undefined) {
			updateData.description = input.description;
		}
		if (input.tags !== undefined) {
			updateData.tags = input.tags;
		}

		// Firestoreを更新
		await videoRef.update(updateData);

		// キャッシュの無効化
		revalidatePath("/admin/videos");
		revalidatePath(`/videos/${videoId}`);

		logger.info("動画情報更新が正常に完了", {
			videoId,
			updatedBy: user.discordId,
			updatedFields: Object.keys(updateData),
		});

		return {
			success: true,
			data: { message: "動画情報を更新しました" },
		};
	} catch (error) {
		logger.error("動画情報更新でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			videoId,
		});

		return {
			success: false,
			error: "動画情報の更新に失敗しました。しばらく時間をおいてから再度お試しください。",
		};
	}
}

/**
 * 管理者用：動画を削除するServer Action
 */
export async function deleteVideo(
	videoId: string,
): Promise<{ success: true; data: { message: string } } | { success: false; error: string }> {
	try {
		logger.info("動画削除を開始", { videoId });

		// 認証チェック（管理者権限必須）
		const user = await requireAuth();
		if (user.role !== "admin") {
			logger.warn("管理者権限が必要", { userId: user.discordId, videoId });
			return {
				success: false,
				error: "この操作には管理者権限が必要です",
			};
		}

		if (!videoId || typeof videoId !== "string") {
			return {
				success: false,
				error: "動画IDが指定されていません",
			};
		}

		const firestore = getFirestore();
		const videoRef = firestore.collection("videos").doc(videoId);

		// 動画の存在確認
		const videoDoc = await videoRef.get();
		if (!videoDoc.exists) {
			return {
				success: false,
				error: "指定された動画が見つかりません",
			};
		}

		// 関連する音声ボタンがある場合の確認
		const audioButtonsQuery = await firestore
			.collection("audioButtons")
			.where("sourceVideoId", "==", videoId)
			.get();

		if (!audioButtonsQuery.empty) {
			logger.warn("関連する音声ボタンが存在するため削除不可", {
				videoId,
				audioButtonsCount: audioButtonsQuery.size,
			});
			return {
				success: false,
				error: `この動画に関連する音声ボタンが${audioButtonsQuery.size}個存在するため削除できません。先に音声ボタンを削除してください。`,
			};
		}

		// 動画削除
		await videoRef.delete();

		// キャッシュの無効化
		revalidatePath("/admin/videos");
		revalidatePath(`/videos/${videoId}`);
		revalidatePath("/videos");

		logger.info("動画削除が正常に完了", {
			videoId,
			deletedBy: user.discordId,
		});

		return {
			success: true,
			data: { message: "動画を削除しました" },
		};
	} catch (error) {
		logger.error("動画削除でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			videoId,
		});

		return {
			success: false,
			error: "動画の削除に失敗しました。しばらく時間をおいてから再度お試しください。",
		};
	}
}

/**
 * 動画の音声ボタン統計を更新するServer Action（内部使用）
 */
export async function updateVideoAudioButtonStats(
	videoId: string,
	options: { increment?: boolean; decrement?: boolean },
): Promise<{ success: boolean; error?: string }> {
	try {
		if (!videoId || typeof videoId !== "string") {
			return {
				success: false,
				error: "動画IDが指定されていません",
			};
		}

		const firestore = getFirestore();
		const videoRef = firestore.collection("videos").doc(videoId);

		// 動画の存在確認
		const videoDoc = await videoRef.get();
		if (!videoDoc.exists) {
			return {
				success: false,
				error: "指定された動画が見つかりません",
			};
		}

		// 更新データの作成
		const updateData: Record<string, unknown> = {
			updatedAt: new Date().toISOString(),
		};

		if (options.increment) {
			updateData.audioButtonCount = FieldValue.increment(1);
			updateData.hasAudioButtons = true;
		}

		if (options.decrement) {
			updateData.audioButtonCount = FieldValue.increment(-1);
			// 音声ボタン数が0になったかどうかは別途チェックが必要
		}

		// Firestoreを更新
		await videoRef.update(updateData);

		// 統計情報更新時はページリロードを避けるため、revalidatePathを削除

		return { success: true };
	} catch (error) {
		logger.error("動画統計更新でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			videoId,
			options,
		});

		return {
			success: false,
			error: "動画統計の更新に失敗しました",
		};
	}
}

/**
 * 管理者用：動画一覧を取得するServer Action
 */
export async function getVideosForAdmin(params?: {
	page?: number;
	limit?: number;
	search?: string;
	year?: string;
	sort?: string;
}): Promise<{ success: true; data: VideoListResult } | { success: false; error: string }> {
	try {
		// 認証チェック（管理者権限必須）
		const authCheck = await checkAdminPermission();
		if (!authCheck.success) {
			return authCheck;
		}

		const firestore = getFirestore();
		const videosRef = firestore.collection("videos");

		// クエリ構築
		let query = buildVideoQuery(videosRef, params);

		// ページネーション
		const limit = params?.limit || 20;
		const page = params?.page || 1;

		if (page > 1) {
			const offset = (page - 1) * limit;
			query = query.offset(offset);
		}

		// limit+1を取得して、次のページがあるかどうかを判定
		const snapshot = await query.limit(limit + 1).get();

		if (snapshot.empty) {
			return createEmptyVideoListResult();
		}

		const docs = snapshot.docs;
		const hasMore = docs.length > limit;
		const videoDocs = hasMore ? docs.slice(0, -1) : docs;

		// データ変換とフィルタリング
		const videos = processVideoDocuments(videoDocs, params?.search);

		const lastVideo = videos.length > 0 ? videos[videos.length - 1] : undefined;

		return {
			success: true,
			data: {
				videos,
				hasMore,
				lastVideo,
			},
		};
	} catch (error) {
		logger.error("管理者用動画一覧取得でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return {
			success: false,
			error: "動画一覧の取得に失敗しました。",
		};
	}
}

// ヘルパー関数：動画リフレッシュの認証チェック
async function validateVideoRefreshAuth(
	videoId: string,
): Promise<{ success: true; user: { discordId: string } } | { success: false; error: string }> {
	const user = await requireAuth();
	if (user.role !== "admin") {
		logger.warn("管理者権限が必要", { userId: user.discordId, videoId });
		return {
			success: false,
			error: "この操作には管理者権限が必要です",
		};
	}

	if (!videoId || typeof videoId !== "string") {
		return {
			success: false,
			error: "動画IDが指定されていません",
		};
	}

	return { success: true, user };
}

// ヘルパー関数：YouTube APIから動画データを取得
async function fetchYouTubeVideoData(
	videoId: string,
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
	const API_KEY = process.env.YOUTUBE_API_KEY;
	if (!API_KEY) {
		return {
			success: false,
			error: "YouTube API設定が見つかりません",
		};
	}

	const response = await fetch(
		`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,statistics&key=${API_KEY}`,
	);

	if (!response.ok) {
		return {
			success: false,
			error: "YouTube APIからのデータ取得に失敗しました",
		};
	}

	const data = await response.json();
	if (!data.items || data.items.length === 0) {
		return {
			success: false,
			error: "指定された動画がYouTubeで見つかりません",
		};
	}

	return { success: true, data };
}

// ヘルパー関数：YouTube APIレスポンスから更新データを構築
function buildVideoUpdateData(apiData: unknown): Record<string, unknown> {
	const data = apiData as { items: unknown[] };
	const video = data.items[0] as {
		snippet: {
			title: string;
			description?: string;
			thumbnails?: {
				maxresdefault?: { url: string };
				high?: { url: string };
			};
		};
		contentDetails?: { duration?: string };
		statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
	};
	const snippet = video.snippet;
	const contentDetails = video.contentDetails;
	const statistics = video.statistics;

	return {
		title: snippet.title,
		description: snippet.description || "",
		thumbnailUrl: snippet.thumbnails?.maxresdefault?.url || snippet.thumbnails?.high?.url || "",
		duration: contentDetails?.duration,
		statistics: {
			viewCount: statistics?.viewCount ? Number.parseInt(statistics.viewCount, 10) : undefined,
			likeCount: statistics?.likeCount ? Number.parseInt(statistics.likeCount, 10) : undefined,
			commentCount: statistics?.commentCount
				? Number.parseInt(statistics.commentCount, 10)
				: undefined,
		},
		lastFetchedAt: new Date().toISOString(),
	};
}

/**
 * 管理者用：動画データをリフレッシュするServer Action
 */
export async function refreshVideoData(
	videoId: string,
): Promise<{ success: true; data: { message: string } } | { success: false; error: string }> {
	try {
		logger.info("動画データリフレッシュを開始", { videoId });

		// 認証チェック
		const authResult = await validateVideoRefreshAuth(videoId);
		if (!authResult.success) {
			return authResult;
		}

		// YouTube APIからデータ取得
		const apiResult = await fetchYouTubeVideoData(videoId);
		if (!apiResult.success) {
			return apiResult;
		}

		// 更新データの構築
		const updateData = buildVideoUpdateData(apiResult.data);

		// Firestoreを更新
		const firestore = getFirestore();
		const videoRef = firestore.collection("videos").doc(videoId);
		await videoRef.update(updateData);

		// キャッシュの無効化
		revalidatePath("/admin/videos");
		revalidatePath(`/videos/${videoId}`);

		logger.info("動画データリフレッシュが正常に完了", {
			videoId,
			refreshedBy: authResult.user.discordId,
		});

		return {
			success: true,
			data: { message: "動画データをリフレッシュしました" },
		};
	} catch (error) {
		logger.error("動画データリフレッシュでエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			videoId,
		});

		return {
			success: false,
			error: "動画データのリフレッシュに失敗しました。しばらく時間をおいてから再度お試しください。",
		};
	}
}
