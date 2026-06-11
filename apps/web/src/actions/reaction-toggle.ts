"use server";

import { requireAuth } from "@/components/system/protected-route";
import { getFirestore } from "@/lib/firestore";
import { updateCounter } from "@/lib/firestore-helpers";
import * as logger from "@/lib/logger";

type ReactionKind = "like" | "dislike";

const SUBCOLLECTION: Record<ReactionKind, string> = { like: "likes", dislike: "dislikes" };
const COUNTER_FIELD: Record<ReactionKind, string> = {
	like: "stats.likeCount",
	dislike: "stats.dislikeCount",
};
const ERROR_MESSAGE: Record<ReactionKind, string> = {
	like: "いいね状態の更新に失敗しました",
	dislike: "低評価状態の更新に失敗しました",
};

export interface ToggleReactionResult {
	success: boolean;
	/** トグル後にそのリアクションが有効か（like なら isLiked、dislike なら isDisliked 相当） */
	active?: boolean;
	error?: string;
}

/**
 * 高評価 / 低評価のトグル（相互排他）。
 *
 * likes.ts / dislikes.ts の約150行の鏡像コピーを統合した正本（SPR-192）。
 * カウンタ更新は lib/firestore-helpers の `updateCounter` を直接叩き、共有層(src/actions/)から
 * route 層(app/buttons/actions)への逆依存を排除する。
 */
export async function toggleReaction(
	audioButtonId: string,
	kind: ReactionKind,
): Promise<ToggleReactionResult> {
	const opposite: ReactionKind = kind === "like" ? "dislike" : "like";

	try {
		const user = await requireAuth();
		const firestore = getFirestore();

		const targetRef = firestore
			.collection("users")
			.doc(user.discordId)
			.collection(SUBCOLLECTION[kind])
			.doc(audioButtonId);
		const oppositeRef = firestore
			.collection("users")
			.doc(user.discordId)
			.collection(SUBCOLLECTION[opposite])
			.doc(audioButtonId);

		const [targetDoc, oppositeDoc] = await Promise.all([targetRef.get(), oppositeRef.get()]);
		const isActive = targetDoc.exists;
		const hasOpposite = oppositeDoc.exists;

		// トランザクションで整合性を保つ（相互排他）
		await firestore.runTransaction(async (transaction) => {
			if (isActive) {
				transaction.delete(targetRef);
			} else {
				transaction.set(targetRef, { audioButtonId, createdAt: new Date().toISOString() });
				if (hasOpposite) {
					transaction.delete(oppositeRef);
				}
			}
		});

		// カウンタ更新は updateCounter を直叩き（route 層を経由しない）
		const targetResult = await updateCounter(
			"audioButtons",
			audioButtonId,
			COUNTER_FIELD[kind],
			isActive ? -1 : 1,
			{ min: 0 },
		);
		if (!targetResult.success) {
			logger.warn(`${kind} カウント更新に失敗`, {
				audioButtonId,
				userId: user.discordId,
				isActive,
				error: targetResult.error,
			});
		}

		// 相互排他で opposite を消した場合は opposite カウンタも減算
		if (!isActive && hasOpposite) {
			const oppositeResult = await updateCounter(
				"audioButtons",
				audioButtonId,
				COUNTER_FIELD[opposite],
				-1,
				{ min: 0 },
			);
			if (!oppositeResult.success) {
				logger.warn(`${opposite} カウント減算に失敗`, {
					audioButtonId,
					userId: user.discordId,
					error: oppositeResult.error,
				});
			}
		}

		logger.info(`${kind} 状態を更新`, {
			audioButtonId,
			userId: user.discordId,
			wasActive: isActive,
			nowActive: !isActive,
			hadOpposite: hasOpposite,
		});

		return { success: true, active: !isActive };
	} catch (error) {
		logger.error(`${kind} 状態の切り替えでエラーが発生`, {
			audioButtonId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return { success: false, error: ERROR_MESSAGE[kind] };
	}
}
