import "server-only";
import type { UserFlags } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import { getJSTDateString } from "@/lib/jst-date";
import {
	calculateGeminiDailyLimit,
	formatTimeUntilReset,
	type GeminiUsageKind,
} from "@/lib/rate-limit-utils";

export type GeminiQuotaResult = { allowed: true } | { allowed: false; error: string };

/**
 * Gemini 呼び出し1回分の日次枠を消費する（SPR-336）。
 * 上限内ならカウンタ（users.dailyGeminiUsage）を +1 して allowed を返し、上限超過・ユーザー不在なら消費しない。
 *
 * **Gemini を呼ぶ直前**に呼ぶこと（キャッシュ命中では呼ばない）。生成が失敗しても枠は戻さない
 * （失敗でも課金は発生しうるため。並行連打で上限を抜けないよう判定と加算は同一トランザクション）。
 * userId を検証しないため server-only。
 */
export async function consumeGeminiQuota(
	userId: string,
	kind: GeminiUsageKind,
): Promise<GeminiQuotaResult> {
	const firestore = getFirestore();
	const userRef = firestore.collection("users").doc(userId);

	return await firestore.runTransaction(async (transaction) => {
		const userDoc = await transaction.get(userRef);
		const userData = userDoc.exists ? userDoc.data() : undefined;
		if (!userData) {
			return { allowed: false, error: "ログインが必要です" };
		}

		const today = getJSTDateString();
		const limit = calculateGeminiDailyLimit(userData.flags as UserFlags | undefined, kind);
		const usage = userData.dailyGeminiUsage;
		const current = usage?.date === today ? (usage[kind] as number | undefined) || 0 : 0;
		if (current >= limit) {
			return {
				allowed: false,
				error: `本日のAI生成の上限（${limit}回）に達しました。${formatTimeUntilReset()}にリセットされます`,
			};
		}

		// 日付が変わっていたら両カウンタをリセットしてから加算
		transaction.update(
			userRef,
			usage?.date === today
				? { [`dailyGeminiUsage.${kind}`]: current + 1 }
				: {
						dailyGeminiUsage: {
							date: today,
							transcription: 0,
							suggestion: 0,
							[kind]: 1,
						},
					},
		);
		return { allowed: true };
	});
}
