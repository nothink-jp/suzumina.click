"use server";

import { getCurrentUser } from "@/lib/auth/server";
import { checkRateLimit, type RateLimitCheckResult } from "@/lib/button-rate-limit";

/**
 * ログイン中ユーザー本人のレート制限情報を取得（UIコンポーネント用）
 *
 * userId を引数に取らない: Server Action は任意の引数で POST できるため、
 * 他人の isFamilyMember・残り作成枠を読ませない（SPR-333）。未ログイン時は null
 */
export async function getUserRateLimitInfo(): Promise<RateLimitCheckResult | null> {
	try {
		const user = await getCurrentUser();
		if (!user) return null;
		return await checkRateLimit(user.discordId);
	} catch (_error) {
		return null;
	}
}
