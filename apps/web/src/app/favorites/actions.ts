"use server";

import {
	type AudioButtonPlainObject,
	audioButtonTransformers,
	type FirestoreServerAudioButtonData,
} from "@suzumina.click/shared-types";
import { getLikeDislikeStatusAction } from "@/actions/dislikes";
import {
	getAudioButtonsFromFavorites,
	getUserFavorites,
	getUserFavoritesCount,
} from "@/lib/favorites-firestore";

interface FetchFavoriteAudioButtonsParams {
	page?: number;
	limit?: number;
	sort?: string;
	userId: string;
}

interface FavoriteAudioButtonsResult {
	audioButtons: AudioButtonPlainObject[];
	totalCount: number;
	hasMore?: boolean;
	likeDislikeStatuses: Record<string, { isLiked: boolean; isDisliked: boolean }>;
}

/**
 * お気に入りリストを取得（ConfigurableList用）
 */
export async function getFavoritesList(
	params: FetchFavoriteAudioButtonsParams,
): Promise<FavoriteAudioButtonsResult> {
	const { limit = 20, sort = "newest", userId } = params;

	try {
		// 総件数を取得
		const totalCount = await getUserFavoritesCount(userId);

		// お気に入り一覧を取得（ページネーション対応）
		const favoritesList = await getUserFavorites(userId, {
			limit,
			orderBy: sort as "newest" | "oldest",
			// ページ番号からオフセットを計算
			// TODO: Firestoreのcursor-based paginationに対応する必要がある
		});

		// 音声ボタンデータを取得
		const audioButtonsMap = await getAudioButtonsFromFavorites(favoritesList.favorites);

		// AudioButtonPlainObject に変換
		const audioButtons: AudioButtonPlainObject[] = [];
		const audioButtonIds: string[] = [];

		favoritesList.favorites.forEach((fav) => {
			const audioButtonData = audioButtonsMap.get(fav.audioButtonId);
			if (!audioButtonData) return;

			const plainObject = audioButtonTransformers.fromFirestore(
				audioButtonData as FirestoreServerAudioButtonData,
			);
			if (plainObject) {
				audioButtons.push(plainObject);
				audioButtonIds.push(plainObject.id);
			}
		});

		// いいね・低評価状態を一括取得
		let likeDislikeStatuses: Record<string, { isLiked: boolean; isDisliked: boolean }> = {};
		if (audioButtonIds.length > 0) {
			const likeDislikeData = await getLikeDislikeStatusAction(audioButtonIds);
			likeDislikeStatuses = Object.fromEntries(likeDislikeData);
		}

		return {
			audioButtons,
			totalCount,
			hasMore: favoritesList.hasMore,
			likeDislikeStatuses,
		};
	} catch (_error) {
		// エラーは握りつぶしてデフォルト値を返す
		return {
			audioButtons: [],
			totalCount: 0,
			likeDislikeStatuses: {},
		};
	}
}
