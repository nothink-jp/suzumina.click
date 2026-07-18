"use client";

import { useEffect } from "react";
import { trackLoginError } from "@/lib/analytics/events";
import { consumeLoginFlowPending } from "@/lib/analytics/login-funnel";

interface LoginErrorTrackerProps {
	error?: string;
}

/**
 * ログインファネル: OAuth コールバックが `?error=` 付きで返ってきた場合にエラーイベントを送る
 * 不可視コンポーネント（/auth/signin・/auth/error の両ページで使う）。
 * error が無い（＝通常のログイン要求で /auth/signin に来ただけ）場合は何もしない。
 */
export function LoginErrorTracker({ error }: LoginErrorTrackerProps) {
	useEffect(() => {
		if (!error) return;
		trackLoginError(error);
		consumeLoginFlowPending();
	}, [error]);

	return null;
}
