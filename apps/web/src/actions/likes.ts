"use server";

import { decrementLikeCount, incrementLikeCount } from "@/app/buttons/actions";
import { requireAuth } from "@/components/system/protected-route";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

/**
 * 音声ボタンのいいね状態を切り替え
 */
export async function toggleLikeAction(audioButtonId: string): Promise<{
	success: boolean;
	isLiked?: boolean;
	error?: string;
}> {
	try {
		const user = await requireAuth();
		const firestore = getFirestore();

		const userLikeRef = firestore
			.collection("users")
			.doc(user.discordId)
			.collection("likes")
			.doc(audioButtonId);

		const userDislikeRef = firestore
			.collection("users")
			.doc(user.discordId)
			.collection("dislikes")
			.doc(audioButtonId);

		const [likeDoc, dislikeDoc] = await Promise.all([userLikeRef.get(), userDislikeRef.get()]);

		const isCurrentlyLiked = likeDoc.exists;
		const isCurrentlyDisliked = dislikeDoc.exists;

		// トランザクションで整合性を保つ
		await firestore.runTransaction(async (transaction) => {
			if (isCurrentlyLiked) {
				// いいねを取り消す
				transaction.delete(userLikeRef);
			} else {
				// いいねを追加
				transaction.set(userLikeRef, {
					audioButtonId,
					createdAt: new Date().toISOString(),
				});

				// 既に低評価が付いている場合は削除（相互排他）
				if (isCurrentlyDisliked) {
					transaction.delete(userDislikeRef);
				}
			}
		});

		// 音声ボタンのいいね数を更新
		const likeUpdateResult = isCurrentlyLiked
			? await decrementLikeCount(audioButtonId)
			: await incrementLikeCount(audioButtonId);

		if (!likeUpdateResult.success) {
			logger.warn("いいね数の更新に失敗", {
				audioButtonId,
				userId: user.discordId,
				isCurrentlyLiked,
				error: likeUpdateResult.error,
			});
		}

		// 低評価が付いていた場合は、低評価数も減少
		if (!isCurrentlyLiked && isCurrentlyDisliked) {
			const { decrementDislikeCount } = await import("@/app/buttons/actions");
			const dislikeUpdateResult = await decrementDislikeCount(audioButtonId);

			if (!dislikeUpdateResult.success) {
				logger.warn("低評価数の減少に失敗", {
					audioButtonId,
					userId: user.discordId,
					error: dislikeUpdateResult.error,
				});
			}
		}

		logger.info("いいね状態を更新", {
			audioButtonId,
			userId: user.discordId,
			wasLiked: isCurrentlyLiked,
			nowLiked: !isCurrentlyLiked,
			hadDislike: isCurrentlyDisliked,
		});

		return {
			success: true,
			isLiked: !isCurrentlyLiked,
		};
	} catch (error) {
		logger.error("いいね状態の切り替えでエラーが発生", {
			audioButtonId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return {
			success: false,
			error: "いいね状態の更新に失敗しました",
		};
	}
}
