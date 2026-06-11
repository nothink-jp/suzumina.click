"use server";

import { getCurrentUser } from "@/lib/auth/server";
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
		// 認可ゲートの正本は getCurrentUser の null チェック（SPR-195）。
		// requireAuth() は redirect() を投げるため try/catch 内で呼ぶと NEXT_REDIRECT が
		// 飲み込まれる。書き込み系 Server Action は redirect せず error を返す契約に揃える。
		// getCurrentUser は isActive を絞らないため、従来 requireAuth が弾いていた無効ユーザーは
		// 明示的にブロックする（リファクタで認可を緩めない）。
		const user = await getCurrentUser();
		if (!user?.discordId || !user.isActive) {
			return { success: false, error: "ログインが必要です" };
		}
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

		// 存在チェックと書き込みはトランザクション内で行い、相互排他の判定を atomic にする。
		// 以前は transaction 外で get していたため、並行トグルで二重 set/delete になる
		// TOCTOU があった（SPR-192 レビュー指摘）。
		let isActive = false;
		let hasOpposite = false;
		await firestore.runTransaction(async (transaction) => {
			const [targetDoc, oppositeDoc] = await Promise.all([
				transaction.get(targetRef),
				transaction.get(oppositeRef),
			]);
			isActive = targetDoc.exists;
			hasOpposite = oppositeDoc.exists;

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
