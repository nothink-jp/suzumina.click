/**
 * 動画関連のFirestore操作を提供するモジュール
 * VIDEO_TAGS_DESIGN.md Phase 2準拠
 */

import { getFirestore } from "./firestore";
import { error as logError } from "./logger";

/**
 * Firestore操作のエラーハンドリング共通関数
 */
function handleFirestoreError(
	operation: string,
	context: Record<string, unknown>,
	error: unknown,
): void {
	if (process.env.NODE_ENV === "development") {
		logError(`${operation} error:`, { ...context, error });
	}
}

/**
 * ユーザータグ更新のレスポンス型
 */
export interface UpdateUserTagsResult {
	success: boolean;
	userTags?: string[];
	error?: string;
}

/**
 * 動画のユーザータグを更新
 *
 * @param videoId - 更新対象の動画ID
 * @param userTags - 新しいユーザータグ配列
 * @returns 更新結果
 */
export async function updateVideoUserTags(
	videoId: string,
	userTags: string[],
): Promise<UpdateUserTagsResult> {
	try {
		const firestore = getFirestore();

		// 動画ドキュメントの存在確認
		const videoRef = firestore.collection("videos").doc(videoId);
		const videoDoc = await videoRef.get();

		if (!videoDoc.exists) {
			return {
				success: false,
				error: "指定された動画が見つかりません",
			};
		}

		// ユーザータグを更新
		await videoRef.update({
			userTags: userTags,
			updatedAt: new Date().toISOString(),
		});

		return {
			success: true,
			userTags: userTags,
		};
	} catch (error) {
		handleFirestoreError("updateVideoUserTags", { videoId, userTags }, error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "ユーザータグの更新に失敗しました",
		};
	}
}

/**
 * 動画のユーザータグを取得
 *
 * @param videoId - 取得対象の動画ID
 * @returns ユーザータグ配列
 */
export async function getVideoUserTags(videoId: string): Promise<string[]> {
	try {
		const firestore = getFirestore();

		const videoRef = firestore.collection("videos").doc(videoId);
		const videoDoc = await videoRef.get();

		if (!videoDoc.exists) {
			return [];
		}

		const data = videoDoc.data();
		return data?.userTags || [];
	} catch (error) {
		handleFirestoreError("getVideoUserTags", { videoId }, error);
		return [];
	}
}

/**
 * IDで単一の動画を取得
 *
 * @param videoId - 取得する動画のID
 * @returns 動画データまたはnull
 */
// biome-ignore lint/suspicious/noExplicitAny: Legacy video data structure
export async function getVideoByIdFromFirestore(videoId: string): Promise<any | null> {
	try {
		const firestore = getFirestore();
		const videoRef = firestore.collection("videos").doc(videoId);
		const videoDoc = await videoRef.get();

		if (!videoDoc.exists) {
			return null;
		}

		return {
			id: videoDoc.id,
			...videoDoc.data(),
		};
	} catch (error) {
		handleFirestoreError("getVideoByIdFromFirestore", { videoId }, error);
		return null;
	}
}

/**
 * 複数のIDで動画を取得
 *
 * @param videoIds - 取得する動画のID配列
 * @returns 動画データの配列
 */
// biome-ignore lint/suspicious/noExplicitAny: Legacy video data structure
export async function getVideosByIdsFromFirestore(videoIds: string[]): Promise<any[]> {
	try {
		const firestore = getFirestore();
		// biome-ignore lint/suspicious/noExplicitAny: Legacy video data structure
		const videos: any[] = [];

		// Firestoreのバッチ取得制限に対応するため、チャンクに分割
		const chunks = [];
		for (let i = 0; i < videoIds.length; i += 10) {
			chunks.push(videoIds.slice(i, i + 10));
		}

		for (const chunk of chunks) {
			const promises = chunk.map(async (id) => {
				const doc = await firestore.collection("videos").doc(id).get();
				if (doc.exists) {
					return {
						id: doc.id,
						...doc.data(),
					};
				}
				return null;
			});

			const results = await Promise.all(promises);
			videos.push(...results.filter((v) => v !== null));
		}

		return videos;
	} catch (error) {
		handleFirestoreError("getVideosByIdsFromFirestore", { videoIds }, error);
		return [];
	}
}
