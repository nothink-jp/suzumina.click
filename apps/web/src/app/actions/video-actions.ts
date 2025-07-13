"use server";

import { FieldValue } from "@google-cloud/firestore";
import {
	convertToFrontendVideo,
	type FirestoreServerVideoData,
	type FrontendVideoData,
	type VideoListResult,
} from "@suzumina.click/shared-types/src/video";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/components/system/protected-route";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

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
		const user = await requireAuth();
		if (user.role !== "admin") {
			return {
				success: false,
				error: "この操作には管理者権限が必要です",
			};
		}

		const firestore = getFirestore();
		const videosRef = firestore.collection("videos");

		// クエリ構築
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
			return {
				success: true,
				data: { videos: [], hasMore: false },
			};
		}

		const docs = snapshot.docs;
		const hasMore = docs.length > limit;
		const videoDocs = hasMore ? docs.slice(0, -1) : docs;

		// データ変換とフィルタリング
		const videos: FrontendVideoData[] = [];

		for (const doc of videoDocs) {
			try {
				const data = doc.data() as FirestoreServerVideoData;

				// 検索フィルタリング
				if (params?.search) {
					const searchLower = params.search.toLowerCase();
					const titleLower = data.title.toLowerCase();
					if (!titleLower.includes(searchLower)) {
						continue;
					}
				}

				// Timestampをiso文字列に変換して、フロントエンドデータに変換
				const firestoreData = {
					id: doc.id,
					videoId: data.videoId || doc.id,
					title: data.title,
					description: data.description || "",
					channelId: data.channelId,
					channelTitle: data.channelTitle,
					publishedAt:
						data.publishedAt instanceof Date
							? data.publishedAt.toISOString()
							: typeof data.publishedAt === "object" &&
									data.publishedAt &&
									"toDate" in data.publishedAt
								? (data.publishedAt as { toDate(): Date }).toDate().toISOString()
								: new Date().toISOString(),
					thumbnailUrl: data.thumbnailUrl || "",
					lastFetchedAt:
						data.lastFetchedAt instanceof Date
							? data.lastFetchedAt.toISOString()
							: typeof data.lastFetchedAt === "object" &&
									data.lastFetchedAt &&
									"toDate" in data.lastFetchedAt
								? (data.lastFetchedAt as { toDate(): Date }).toDate().toISOString()
								: new Date().toISOString(),
					videoType: data.videoType,
					liveBroadcastContent: data.liveBroadcastContent,
					audioButtonCount: data.audioButtonCount || 0,
					hasAudioButtons: data.hasAudioButtons || false,
				};

				const frontendVideo = convertToFrontendVideo(firestoreData);
				videos.push(frontendVideo);
			} catch (conversionError) {
				logger.warn("動画データ変換エラー", {
					docId: doc.id,
					error:
						conversionError instanceof Error ? conversionError.message : String(conversionError),
				});
				// 変換エラーは無視して次の動画を処理
			}
		}

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

/**
 * 管理者用：動画データをリフレッシュするServer Action
 */
export async function refreshVideoData(
	videoId: string,
): Promise<{ success: true; data: { message: string } } | { success: false; error: string }> {
	try {
		logger.info("動画データリフレッシュを開始", { videoId });

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

		// YouTube Data APIから最新情報を取得（実装は省略、実際はYouTube APIを呼び出し）
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

		const video = data.items[0];
		const snippet = video.snippet;
		const contentDetails = video.contentDetails;
		const statistics = video.statistics;

		// Firestoreを更新
		const firestore = getFirestore();
		const videoRef = firestore.collection("videos").doc(videoId);

		const updateData = {
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

		await videoRef.update(updateData);

		// キャッシュの無効化
		revalidatePath("/admin/videos");
		revalidatePath(`/videos/${videoId}`);

		logger.info("動画データリフレッシュが正常に完了", {
			videoId,
			refreshedBy: user.discordId,
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
