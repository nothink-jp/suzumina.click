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

	// 同日の場合。欠けたフィールドは新規作成時と同じ値で補う（上限の正本は calculateDailyLimit）
	const current = dailyLimit.count || 0;
	const limit = dailyLimit.limit || calculateDailyLimit(flags);
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
		if ((dailyLimit.count || 0) >= (dailyLimit.limit || calculateDailyLimit(flags))) {
			return false;
		}

		// カウントを増やす
		transaction.update(userRef, {
			"dailyButtonLimit.count": (dailyLimit.count || 0) + 1,
		});

		return true;
	});
}
