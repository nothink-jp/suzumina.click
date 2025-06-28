/**
 * お気に入り関連のサーバーアクション
 */

"use server";

import type {
	AddFavoriteInput,
	FavoriteStatus,
	RemoveFavoriteInput,
} from "@suzumina.click/shared-types";
import { auth } from "@/auth";
import {
	addFavorite,
	getFavoriteStatus,
	getFavoritesStatus,
	removeFavorite,
	toggleFavorite,
} from "@/lib/favorites-firestore";

/**
 * 音声ボタンをお気に入りに追加
 */
export async function addFavoriteAction(
	input: AddFavoriteInput,
): Promise<{ success: boolean; error?: string }> {
	try {
		const session = await auth();
		if (!session?.user?.discordId) {
			return { success: false, error: "ログインが必要です" };
		}

		const result = await addFavorite(session.user.discordId, input);
		return result;
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "お気に入りの追加に失敗しました",
		};
	}
}

/**
 * 音声ボタンをお気に入りから削除
 */
export async function removeFavoriteAction(
	input: RemoveFavoriteInput,
): Promise<{ success: boolean; error?: string }> {
	try {
		const session = await auth();
		if (!session?.user?.discordId) {
			return { success: false, error: "ログインが必要です" };
		}

		const result = await removeFavorite(session.user.discordId, input);
		return result;
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "お気に入りの削除に失敗しました",
		};
	}
}

/**
 * お気に入り状態を切り替え
 */
export async function toggleFavoriteAction(
	audioButtonId: string,
): Promise<{ success: boolean; isFavorited?: boolean; error?: string }> {
	try {
		const session = await auth();
		if (!session?.user?.discordId) {
			return { success: false, error: "ログインが必要です" };
		}

		const result = await toggleFavorite(session.user.discordId, audioButtonId);
		return { success: true, isFavorited: result.isFavorited };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "お気に入りの切り替えに失敗しました",
		};
	}
}

/**
 * 音声ボタンのお気に入り状態を取得
 */
export async function getFavoriteStatusAction(audioButtonId: string): Promise<FavoriteStatus> {
	try {
		const session = await auth();
		if (!session?.user?.discordId) {
			return { isFavorited: false };
		}

		return await getFavoriteStatus(session.user.discordId, audioButtonId);
	} catch (_error) {
		return { isFavorited: false };
	}
}

/**
 * 複数の音声ボタンのお気に入り状態を一括取得
 */
export async function getFavoritesStatusAction(
	audioButtonIds: string[],
): Promise<Map<string, boolean>> {
	try {
		const session = await auth();
		if (!session?.user?.discordId) {
			// 未ログイン時は全てfalseを返す
			const statusMap = new Map<string, boolean>();
			audioButtonIds.forEach((id) => statusMap.set(id, false));
			return statusMap;
		}

		return await getFavoritesStatus(session.user.discordId, audioButtonIds);
	} catch (_error) {
		// エラー時は全てfalseを返す
		const statusMap = new Map<string, boolean>();
		audioButtonIds.forEach((id) => statusMap.set(id, false));
		return statusMap;
	}
}
