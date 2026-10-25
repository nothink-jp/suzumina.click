import "server-only";
import type { UserFlags } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";
import { calculateDailyLimit, getJSTDateString } from "@/lib/rate-limit-utils";

/**
 * レート制限チェックの結果
 */
export interface RateLimitCheckResult {
	canCreate: boolean;
	current: number;
	limit: number;
	remaining: number;
	isFamilyMember: boolean;
}

const USER_NOT_FOUND_RESULT: RateLimitCheckResult = {
	canCreate: false,
	current: 0,
	limit: 0,
	remaining: 0,
	isFamilyMember: false,
};

/**
 * 同日分の dailyButtonLimit から現在数と上限を解決する。欠けたフィールドは新規作成時と同じ値で補う
 *
 * 表示（checkRateLimit）と書き込み（incrementButtonCount）が同じ補い方をするための単一の正本。
 * ずれると「表示では作れるのにトランザクションで拒否」が起きる
 */
function resolveSameDayLimit(
	dailyLimit: { count?: number; limit?: number },
	flags: UserFlags | undefined,
): { current: number; limit: number } {
	return {
		current: dailyLimit.count || 0,
		limit: dailyLimit.limit || calculateDailyLimit(flags),
	};
}

/**
 * レート制限をチェック（必要に応じてリセット）
 *
 * userId を検証しないため server-only。client へは本人限定の `getUserRateLimitInfo` 経由で出す（SPR-333）
 */
export async function checkRateLimit(userId: string): Promise<RateLimitCheckResult> {
	const firestore = getFirestore();
	const userDoc = await firestore.collection("users").doc(userId).get();
	const userData = userDoc.exists ? userDoc.data() : undefined;
	if (!userData) {
		return { ...USER_NOT_FOUND_RESULT };
	}

	const today = getJSTDateString();
	const dailyLimit = userData.dailyButtonLimit || {};
	const flags = userData.flags as UserFlags | undefined;

	// 日付が変わっていたら自動リセット
	if (dailyLimit.date !== today) {
		const newLimit = calculateDailyLimit(flags);
		return {
			canCreate: true,
			current: 0,
			limit: newLimit,
			remaining: newLimit,
			isFamilyMember: flags?.isFamilyMember || false,
		};
	}

	// 同日の場合
	const { current, limit } = resolveSameDayLimit(dailyLimit, flags);
	const remaining = Math.max(0, limit - current);
	return {
		canCreate: remaining > 0,
		current,
		limit,
		remaining,
		isFamilyMember: flags?.isFamilyMember || false,
	};
}

/**
 * ボタン作成時にカウントを増やす
 */
export async function incrementButtonCount(userId: string): Promise<boolean> {
	const firestore = getFirestore();

	return await firestore.runTransaction(async (transaction) => {
		const userRef = firestore.collection("users").doc(userId);
		const userDoc = await transaction.get(userRef);

		if (!userDoc.exists) return false;

		const userData = userDoc.data();
		if (!userData) return false;

		const today = getJSTDateString();
		const dailyLimit = userData.dailyButtonLimit || {};
		const flags = userData.flags as UserFlags | undefined;

		// 日付が変わっていたらリセット
		if (dailyLimit.date !== today) {
			const newLimit = calculateDailyLimit(flags);
			transaction.update(userRef, {
				dailyButtonLimit: {
					date: today,
					count: 1,
					limit: newLimit,
					guildChecked: false,
				},
			});
			return true;
		}

		// 上限チェック
		const { current, limit } = resolveSameDayLimit(dailyLimit, flags);
		if (current >= limit) {
			return false;
		}

		// カウントを増やす
		transaction.update(userRef, {
			"dailyButtonLimit.count": current + 1,
		});

		return true;
	});
}
