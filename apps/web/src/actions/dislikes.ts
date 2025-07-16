"use server";

import { decrementDislikeCount, incrementDislikeCount } from "@/app/buttons/actions";
import { requireAuth } from "@/components/system/protected-route";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

/**
 * ユーザーの音声ボタンに対する低評価状態を取得
 */
export async function getDislikesStatusAction(
	audioButtonIds: string[],
): Promise<Map<string, boolean>> {
	try {
		const user = await requireAuth();
		const firestore = getFirestore();

		const statusMap = new Map<string, boolean>();

		// 各音声ボタンIDに対して低評価状態を確認
		const dislikeChecks = audioButtonIds.map(async (audioButtonId) => {
			try {
				const dislikeDoc = await firestore
					.collection("users")
					.doc(user.discordId)
					.collection("dislikes")
					.doc(audioButtonId)
					.get();

				return { audioButtonId, isDisliked: dislikeDoc.exists };
			} catch (_error) {
				return { audioButtonId, isDisliked: false };
			}
		});

		const results = await Promise.all(dislikeChecks);
		results.forEach(({ audioButtonId, isDisliked }) => {
			statusMap.set(audioButtonId, isDisliked);
		});

		return statusMap;
	} catch (_error) {
		// 認証エラーの場合は空のMapを返す
		return new Map<string, boolean>();
	}
}

/**
 * 音声ボタンの低評価状態を切り替え
 */
export async function toggleDislikeAction(audioButtonId: string): Promise<{
	success: boolean;
	isDisliked?: boolean;
	error?: string;
}> {
	try {
		const user = await requireAuth();
		const firestore = getFirestore();

		const userDislikeRef = firestore
			.collection("users")
			.doc(user.discordId)
			.collection("dislikes")
			.doc(audioButtonId);

		const userLikeRef = firestore
			.collection("users")
			.doc(user.discordId)
			.collection("likes")
			.doc(audioButtonId);

		const [dislikeDoc, likeDoc] = await Promise.all([userDislikeRef.get(), userLikeRef.get()]);

		const isCurrentlyDisliked = dislikeDoc.exists;
		const isCurrentlyLiked = likeDoc.exists;

		// トランザクションで整合性を保つ
		await firestore.runTransaction(async (transaction) => {
			if (isCurrentlyDisliked) {
				// 低評価を取り消す
				transaction.delete(userDislikeRef);
			} else {
				// 低評価を追加
				transaction.set(userDislikeRef, {
					audioButtonId,
					createdAt: new Date().toISOString(),
				});

				// 既にいいねが付いている場合は削除（相互排他）
				if (isCurrentlyLiked) {
					transaction.delete(userLikeRef);
				}
			}
		});

		// 音声ボタンの低評価数を更新
		const dislikeUpdateResult = isCurrentlyDisliked
			? await decrementDislikeCount(audioButtonId)
			: await incrementDislikeCount(audioButtonId);

		if (!dislikeUpdateResult.success) {
			logger.warn("低評価数の更新に失敗", {
				audioButtonId,
				userId: user.discordId,
				isCurrentlyDisliked,
				error: dislikeUpdateResult.error,
			});
		}

		// いいねが付いていた場合は、いいね数も減少
		if (!isCurrentlyDisliked && isCurrentlyLiked) {
			const { decrementLikeCount } = await import("@/app/buttons/actions");
			const likeUpdateResult = await decrementLikeCount(audioButtonId);

			if (!likeUpdateResult.success) {
				logger.warn("いいね数の減少に失敗", {
					audioButtonId,
					userId: user.discordId,
					error: likeUpdateResult.error,
				});
			}
		}

		logger.info("低評価状態を更新", {
			audioButtonId,
			userId: user.discordId,
			wasDisliked: isCurrentlyDisliked,
			nowDisliked: !isCurrentlyDisliked,
			hadLike: isCurrentlyLiked,
		});

		return {
			success: true,
			isDisliked: !isCurrentlyDisliked,
		};
	} catch (error) {
		logger.error("低評価状態の切り替えでエラーが発生", {
			audioButtonId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return {
			success: false,
			error: "低評価状態の更新に失敗しました",
		};
	}
}

/**
 * 音声ボタンの高評価と低評価の状態を同時に取得
 */
export async function getLikeDislikeStatusAction(
	audioButtonIds: string[],
): Promise<Map<string, { isLiked: boolean; isDisliked: boolean }>> {
	try {
		const user = await requireAuth();
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
		// 認証エラーの場合は空のMapを返す
		return new Map<string, { isLiked: boolean; isDisliked: boolean }>();
	}
}
