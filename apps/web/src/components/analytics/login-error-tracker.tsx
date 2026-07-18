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
 *
 * pending 印（login-funnel.ts）が無い場合も送らない。印が無いのは「このタブが開始した
 * ログイン試行の結果ではない」ケース（このエラーページの reload・戻る/進むでの再訪問・
 * URL の直接共有/ブックマーク経由の再訪問）で、login_start と対応しない login_error を
 * 計上すると SPR-267 の判断材料（開始→エラーの転換率）が水増しされる。
 */
export function LoginErrorTracker({ error }: LoginErrorTrackerProps) {
	useEffect(() => {
		if (!error) return;
		if (consumeLoginFlowPending()) {
			trackLoginError(error);
		}
	}, [error]);

	return null;
}
