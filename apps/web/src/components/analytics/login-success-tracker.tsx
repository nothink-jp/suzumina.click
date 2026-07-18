"use client";

import { useEffect } from "react";
import { trackLoginSuccess } from "@/lib/analytics/events";
import { consumeLoginFlowPending } from "@/lib/analytics/login-funnel";
import { useSessionState } from "@/lib/auth/client";

/**
 * ログインファネル: OAuth 完了後、セッションが初めて確立したタイミングを検知して
 * login_success を送る不可視コンポーネント（全ページ mount・InternalTrafficMarker と同型）。
 *
 * login_flow_pending の印（login-funnel.ts）が無い場合は「元々ログイン済みの通常ページ読み込み」
 * であり誤発火させない。印を消費するのはこの effect が初めて解決したタイミングの一度きり。
 */
export function LoginSuccessTracker() {
	const { user, isPending } = useSessionState();

	useEffect(() => {
		if (isPending) return;
		if (user && consumeLoginFlowPending()) {
			trackLoginSuccess("discord");
		}
	}, [isPending, user]);

	return null;
}
