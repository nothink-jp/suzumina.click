/**
 * Video PlainObject対応のサーバーアクション
 *
 * VideoPlainObjectを使用したサーバーサイドの操作を提供します。
 * 既存のvideo関連actionsとの共存を考慮し、V2サフィックスを使用。
 */

"use server";

import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { auth } from "@/auth";
import { getVideoByIdFromFirestore, getVideosByIdsFromFirestore } from "@/lib/video-firestore";

/**
 * 単一動画取得のレスポンス型
 */
export interface GetVideoResponse {
	success: boolean;
	video?: VideoPlainObject;
	error?: string;
}

/**
 * 複数動画取得のレスポンス型
 */
export interface GetVideosResponse {
	success: boolean;
	videos?: VideoPlainObject[];
	error?: string;
}

/**
 * 動画をVideo V2エンティティとして取得
 *
 * @param videoId - 取得する動画のID
 * @returns Video V2エンティティまたはエラー
 */
export async function getVideoAction(videoId: string): Promise<GetVideoResponse> {
	try {
		// 入力値検証
		if (!videoId || typeof videoId !== "string") {
			return { success: false, error: "有効な動画IDが必要です" };
		}

		// Firestoreから動画データを取得
		const legacyVideo = await getVideoByIdFromFirestore(videoId);
		if (!legacyVideo) {
			return { success: false, error: "動画が見つかりません" };
		}

		// Video V2エンティティに変換
		// 注: mapLegacyToVideoEntity関数はvideo-mapper-v2.tsに実装済み
		// ここでは直接importせず、将来的な実装を想定
		// 現時点では型のみ使用し、実際の変換は後のPRで実装

		return {
			success: true,
			video: legacyVideo as unknown as VideoPlainObject, // 一時的なキャスト
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "動画の取得に失敗しました",
		};
	}
}

/**
 * 複数の動画をVideo V2エンティティとして取得
 *
 * @param videoIds - 取得する動画のID配列
 * @returns Video V2エンティティの配列またはエラー
 */
export async function getVideosAction(videoIds: string[]): Promise<GetVideosResponse> {
	try {
		// 入力値検証
		if (!Array.isArray(videoIds)) {
			return { success: false, error: "動画IDの配列が必要です" };
		}

		if (videoIds.length === 0) {
			return { success: true, videos: [] };
		}

		// 重複を除去
		const uniqueVideoIds = [...new Set(videoIds)];

		// バッチサイズ制限（Firestoreの制限に合わせて30件）
		if (uniqueVideoIds.length > 30) {
			return { success: false, error: "一度に取得できる動画は30件までです" };
		}

		// Firestoreから動画データを取得
		const legacyVideos = await getVideosByIdsFromFirestore(uniqueVideoIds);

		// Video V2エンティティに変換
		// 注: 実際の変換は後のPRで実装
		const videosV2 = legacyVideos as unknown as VideoPlainObject[];

		return {
			success: true,
			videos: videosV2,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "動画の取得に失敗しました",
		};
	}
}

/**
 * 認証が必要な動画操作の例
 * タグ更新などの機能はuser-tags.tsで実装済みのため、
 * ここでは将来的な拡張のための枠組みのみ提供
 */
export async function updateVideoAction(
	_videoId: string,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_updates: Partial<VideoPlainObject>,
): Promise<{ success: boolean; error?: string }> {
	try {
		// 認証チェック
		const session = await auth();
		if (!session?.user?.discordId) {
			return { success: false, error: "ログインが必要です" };
		}

		// 管理者権限チェック（必要に応じて）
		// if (session.user.role !== "admin") {
		//   return { success: false, error: "この操作には管理者権限が必要です" };
		// }

		// TODO: 実際の更新処理は後のPRで実装
		// 現時点では枠組みのみ

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "動画の更新に失敗しました",
		};
	}
}
