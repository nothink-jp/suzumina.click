"use client";

import { useEffect } from "react";
import {
	applyStoredInternalTrafficFlag,
	syncInternalTrafficFromSession,
} from "@/lib/analytics/internal-traffic";
import { useSessionState } from "@/lib/auth/client";

/**
 * オーナー内部トラフィックのタグ付けを行う不可視コンポーネント（SPR-149）。
 * PageViewTracker より先に効かせたいため、deferred 層の lazy 群とは別に直接 mount する
 * （数行のため chunk 分離の価値もない）。
 */
export function InternalTrafficMarker() {
	const { user, isPending } = useSessionState();

	// 再訪時: セッション解決を待たず localStorage の印で即タグ適用（初回 page_view の取りこぼし低減）
	useEffect(() => {
		applyStoredInternalTrafficFlag();
	}, []);

	// セッション解決後: オーナー判定で印を更新
	useEffect(() => {
		if (!isPending) {
			syncInternalTrafficFromSession(user?.discordId);
		}
	}, [isPending, user?.discordId]);

	return null;
}
