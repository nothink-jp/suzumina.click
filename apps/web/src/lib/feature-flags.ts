/**
 * Feature Flags Management for Frontend
 *
 * フロントエンドにおけるフィーチャーフラグの管理と評価
 */

import type {
	defaultFeatureFlags,
	FeatureFlagContext,
	FeatureFlagEvaluation,
	FeatureFlags,
} from "@suzumina.click/shared-types";

/**
 * フィーチャーフラグの設定を取得
 *
 * 実際の実装では以下から取得可能：
 * 1. 環境変数
 * 2. APIエンドポイント
 * 3. ローカルストレージ（開発時）
 * 4. リモート設定サービス
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
	// 開発環境では環境変数から読み込み
	if (process.env.NODE_ENV === "development") {
		const localFlags = getLocalFeatureFlags();
		if (localFlags) return localFlags;
	}

	// 本番環境ではAPIから取得（将来実装）
	// const flags = await fetchFeatureFlagsFromAPI();

	// 現時点ではデフォルト値を返す
	const { defaultFeatureFlags } = await import("@suzumina.click/shared-types");
	return defaultFeatureFlags;
}

/**
 * ローカル開発用のフィーチャーフラグを取得
 */
function getLocalFeatureFlags(): FeatureFlags | null {
	if (typeof window === "undefined") return null;

	try {
		const stored = localStorage.getItem("featureFlags");
		if (stored) {
			return JSON.parse(stored) as FeatureFlags;
		}
	} catch (error) {
		console.error("Failed to load local feature flags:", error);
	}

	return null;
}

/**
 * フィーチャーフラグを評価
 */
export function evaluateFeatureFlag(
	flags: FeatureFlags,
	feature: "video" | "audioButton",
	context: FeatureFlagContext,
): FeatureFlagEvaluation {
	const startTime = Date.now();

	// デバッグ情報の初期化
	const debug = context.debug
		? {
				context,
				flags,
				evaluationTime: 0,
			}
		: undefined;

	// Entity V2が無効の場合
	if (flags.entityV2.mode === "disabled") {
		return createEvaluation(false, "disabled", debug, startTime);
	}

	const entityV2 = flags.entityV2;
	const featureEnabled = feature === "video" ? entityV2.video : entityV2.audioButton;

	// 機能別フラグが無効の場合
	if (!featureEnabled) {
		return createEvaluation(false, "disabled", debug, startTime);
	}

	// ブラックリストチェック
	if (context.userId && entityV2.rollout.blacklist.includes(context.userId)) {
		return createEvaluation(false, "blacklist", debug, startTime);
	}

	// ホワイトリストチェック
	if (context.userId && entityV2.rollout.whitelist.includes(context.userId)) {
		return createEvaluation(true, "whitelist", debug, startTime);
	}

	// パーセンテージロールアウト
	const hash = hashString(context.sessionId);
	const bucket = Math.abs(hash % 100);
	const enabled = bucket < entityV2.rollout.percentage;

	return createEvaluation(enabled, "percentage", debug, startTime);
}

/**
 * 評価結果を作成
 */
function createEvaluation(
	enabled: boolean,
	reason: FeatureFlagEvaluation["reason"],
	debug: FeatureFlagEvaluation["debug"] | undefined,
	startTime: number,
): FeatureFlagEvaluation {
	if (debug) {
		debug.evaluationTime = Date.now() - startTime;
	}

	return { enabled, reason, debug };
}

/**
 * 文字列のハッシュ値を計算（安定したバケット分割用）
 */
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}

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
			.catch((error) => {
				console.error("Failed to load feature flags:", error);
				// エラー時はデフォルト値を使用
				import("@suzumina.click/shared-types").then(({ defaultFeatureFlags }) => {
					setFlags(defaultFeatureFlags);
				});
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

// React import（実際の実装時に必要）
import { useEffect, useMemo, useState } from "react";

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
	return "server-" + Math.random().toString(36).substring(2);
}

/**
 * エラーメトリクスの報告
 */
export function reportFeatureFlagError(feature: "video" | "audioButton", error: Error): void {
	// TODO: 実際の実装ではモニタリングサービスに送信
	console.error(`Feature flag error for ${feature}:`, error);
}

/**
 * パフォーマンスメトリクスの報告
 */
export function reportFeatureFlagMetrics(
	feature: "video" | "audioButton",
	metrics: {
		loadTime?: number;
		renderTime?: number;
		errorCount?: number;
	},
): void {
	// TODO: 実際の実装では分析サービスに送信
	if (process.env.NODE_ENV === "development") {
		console.log(`Feature flag metrics for ${feature}:`, metrics);
	}
}
