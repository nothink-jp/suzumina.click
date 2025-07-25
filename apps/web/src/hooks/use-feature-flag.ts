"use client";

import {
	defaultFeatureFlags,
	type FeatureFlagContext,
	type FeatureFlags,
} from "@suzumina.click/shared-types";
import { useEffect, useMemo, useState } from "react";
import { evaluateFeatureFlag, getFeatureFlags } from "@/lib/feature-flags";

/**
 * React Hook: フィーチャーフラグの使用
 */
export function useFeatureFlag(feature: "video" | "audioButton"): {
	enabled: boolean;
	loading: boolean;
} {
	const [flags, setFlags] = useState<FeatureFlags | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getFeatureFlags()
			.then(setFlags)
			.catch((_error) => {
				// エラー時はデフォルト値を使用
				setFlags(defaultFeatureFlags);
			})
			.finally(() => setLoading(false));
	}, []);

	const context = useMemo<FeatureFlagContext>(
		() => ({
			userId: getCurrentUserId(), // 実装は別途必要
			sessionId: getSessionId(), // 実装は別途必要
			environment: process.env.NODE_ENV === "production" ? "production" : "development",
			debug: process.env.NODE_ENV === "development",
		}),
		[],
	);

	const enabled = useMemo(() => {
		if (!flags) return false;
		const evaluation = evaluateFeatureFlag(flags, feature, context);
		return evaluation.enabled;
	}, [flags, feature, context]);

	return { enabled, loading };
}

// ヘルパー関数（実際の実装では別ファイルから取得）
function getCurrentUserId(): string | undefined {
	// TODO: 実際の実装では認証情報から取得
	return undefined;
}

function getSessionId(): string {
	// TODO: 実際の実装ではセッションIDを管理
	if (typeof window !== "undefined") {
		let sessionId = sessionStorage.getItem("sessionId");
		if (!sessionId) {
			sessionId = Math.random().toString(36).substring(2);
			sessionStorage.setItem("sessionId", sessionId);
		}
		return sessionId;
	}
	return `server-${Math.random().toString(36).substring(2)}`;
}
