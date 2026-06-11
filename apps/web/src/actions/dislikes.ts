"use server";

import { getCurrentUser } from "@/lib/auth/server";
import { getFirestore } from "@/lib/firestore";
import { toggleReaction } from "./reaction-toggle";

/**
 * 音声ボタンの低評価状態を切り替え（正本は reaction-toggle の toggleReaction）
 */
export async function toggleDislikeAction(audioButtonId: string): Promise<{
	success: boolean;
	isDisliked?: boolean;
	error?: string;
}> {
	const result = await toggleReaction(audioButtonId, "dislike");
	return { success: result.success, isDisliked: result.active, error: result.error };
}

/**
 * 音声ボタンの高評価と低評価の状態を同時に取得
 */
export async function getLikeDislikeStatusAction(
	audioButtonIds: string[],
): Promise<Map<string, { isLiked: boolean; isDisliked: boolean }>> {
	// 認可ゲートの正本は getCurrentUser（SPR-195）。状態取得は未認証/無効ユーザーなら
	// 空 Map を返すだけで redirect しない（requireAuth の NEXT_REDIRECT を catch で飲む構造を避ける）。
	const user = await getCurrentUser();
	if (!user?.discordId || !user.isActive) {
		return new Map<string, { isLiked: boolean; isDisliked: boolean }>();
	}

	try {
		const firestore = getFirestore();

		const statusMap = new Map<string, { isLiked: boolean; isDisliked: boolean }>();

		// 各音声ボタンIDに対して高評価・低評価状態を確認
		const statusChecks = audioButtonIds.map(async (audioButtonId) => {
			try {
				const [likeDoc, dislikeDoc] = await Promise.all([
					firestore
						.collection("users")
						.doc(user.discordId)
						.collection("likes")
						.doc(audioButtonId)
						.get(),
					firestore
						.collection("users")
						.doc(user.discordId)
						.collection("dislikes")
						.doc(audioButtonId)
						.get(),
				]);

				return {
					audioButtonId,
					isLiked: likeDoc.exists,
					isDisliked: dislikeDoc.exists,
				};
			} catch (_error) {
				return {
					audioButtonId,
					isLiked: false,
					isDisliked: false,
				};
			}
		});

		const results = await Promise.all(statusChecks);
		results.forEach(({ audioButtonId, isLiked, isDisliked }) => {
			statusMap.set(audioButtonId, { isLiked, isDisliked });
		});

		return statusMap;
	} catch (_error) {
		// Firestore エラー時も空の Map にフォールバック（表示は状態なしになる）
		return new Map<string, { isLiked: boolean; isDisliked: boolean }>();
	}
}
