/**
 * Feature Flags Management for Frontend
 *
 * フロントエンドにおけるフィーチャーフラグの管理と評価
 */

import {
	defaultFeatureFlags,
	type FeatureFlagContext,
	type FeatureFlagEvaluation,
	type FeatureFlags,
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
	return defaultFeatureFlags;
}

/**
 * ローカル開発用のフィーチャーフラグを取得
 */
function getLocalFeatureFlags(): FeatureFlags | null {
	// サーバーサイドでは環境変数から読み込む
	if (typeof window === "undefined") {
		const isEnabled = process.env.ENABLE_ENTITY_V2 === "true";

		// シンプルな設定：有効ならすべてON
		return {
			entityV2: {
				video: isEnabled,
				audioButton: isEnabled,
				mode: isEnabled ? "enabled" : "disabled",
				rollout: {
					percentage: isEnabled ? 100 : 0,
					whitelist: [],
					blacklist: [],
				},
			},
			monitoring: defaultFeatureFlags.monitoring,
		};
	}

	// クライアントサイドではLocalStorageから読み込む
	try {
		const stored = localStorage.getItem("featureFlags");
		if (stored) {
			return JSON.parse(stored) as FeatureFlags;
		}
	} catch (_error) {}

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
 *
 * djb2ライクなハッシュアルゴリズムを使用。
 * 同じ入力に対して常に同じハッシュ値を生成することで、
 * ユーザーのバケット割り当てを安定させる。
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
 * エラーメトリクスの報告
 */
export function reportFeatureFlagError(feature: "video" | "audioButton", error: Error): void {
	// エラーログを出力
	console.error(`Feature flag error for ${feature}:`, error);

	// Google Analyticsに送信
	if (typeof window !== "undefined" && window.gtag) {
		window.gtag("event", "feature_flag_error", {
			feature_name: feature,
			error_message: error.message,
			error_stack: error.stack?.slice(0, 500), // スタックトレースは最初の500文字まで
			entity_v2_enabled: true,
		});
	}
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
	// 開発環境ではコンソールに出力
	if (process.env.NODE_ENV === "development") {
		console.log(`Feature flag metrics for ${feature}:`, metrics);
	}

	// Google Analyticsに送信
	if (typeof window !== "undefined" && window.gtag) {
		window.gtag("event", "feature_flag_performance", {
			feature_name: feature,
			load_time_ms: metrics.loadTime,
			render_time_ms: metrics.renderTime,
			error_count: metrics.errorCount || 0,
			entity_v2_enabled: true,
		});
	}
}
