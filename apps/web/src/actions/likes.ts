"use server";

import { decrementLikeCount, incrementLikeCount } from "@/app/buttons/actions";
import { requireAuth } from "@/components/ProtectedRoute";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

/**
 * ユーザーの音声ボタンに対するいいね状態を取得
 */
export async function getLikesStatusAction(
	audioButtonIds: string[],
): Promise<Map<string, boolean>> {
	try {
		const user = await requireAuth();
		const firestore = getFirestore();

		const statusMap = new Map<string, boolean>();

		// 各音声ボタンIDに対していいね状態を確認
		const likeChecks = audioButtonIds.map(async (audioButtonId) => {
			try {
				const likeDoc = await firestore
					.collection("users")
					.doc(user.discordId)
					.collection("likes")
					.doc(audioButtonId)
					.get();

				return { audioButtonId, isLiked: likeDoc.exists };
			} catch (_error) {
				return { audioButtonId, isLiked: false };
			}
		});

		const results = await Promise.all(likeChecks);
		results.forEach(({ audioButtonId, isLiked }) => {
			statusMap.set(audioButtonId, isLiked);
		});

		return statusMap;
	} catch (_error) {
		// 認証エラーの場合は空のMapを返す
		return new Map<string, boolean>();
	}
}

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

		const likeDoc = await userLikeRef.get();
		const isCurrentlyLiked = likeDoc.exists;

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

		logger.info("いいね状態を更新", {
			audioButtonId,
			userId: user.discordId,
			wasLiked: isCurrentlyLiked,
			nowLiked: !isCurrentlyLiked,
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
