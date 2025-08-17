"use server";

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

/**
 * レート制限をチェック（必要に応じてリセット）
 */
export async function checkRateLimit(userId: string): Promise<RateLimitCheckResult> {
	const firestore = getFirestore();
	const userDoc = await firestore.collection("users").doc(userId).get();

	if (!userDoc.exists) {
		return {
			canCreate: false,
			current: 0,
			limit: 0,
			remaining: 0,
			isFamilyMember: false,
		};
	}

	const userData = userDoc.data();
	if (!userData) {
		return {
			canCreate: false,
			current: 0,
			limit: 0,
			remaining: 0,
			isFamilyMember: false,
		};
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
	return {
		canCreate: dailyLimit.count < dailyLimit.limit,
		current: dailyLimit.count || 0,
		limit: dailyLimit.limit || 10,
		remaining: Math.max(0, (dailyLimit.limit || 10) - (dailyLimit.count || 0)),
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
		if ((dailyLimit.count || 0) >= (dailyLimit.limit || 10)) {
			return false;
		}

		// カウントを増やす
		transaction.update(userRef, {
			"dailyButtonLimit.count": (dailyLimit.count || 0) + 1,
		});

		return true;
	});
}

/**
 * ユーザーのレート制限情報を取得（UIコンポーネント用）
 */
export async function getUserRateLimitInfo(userId: string): Promise<RateLimitCheckResult | null> {
	try {
		return await checkRateLimit(userId);
	} catch (_error) {
		return null;
	}
}
