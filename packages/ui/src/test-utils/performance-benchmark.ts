/**
 * パフォーマンスベンチマークユーティリティ - Phase 2e 実装
 *
 * 設計特徴:
 * - 96+件データでの標準ベンチマーク
 * - 複数パターンでの比較テスト
 * - 本番環境相当の負荷テスト
 * - 回帰テスト用の基準値設定
 */

import type { AudioButton } from "@suzumina.click/shared-types";

export interface BenchmarkConfig {
	/** データセットサイズ */
	datasetSizes: number[];

	/** テスト繰り返し回数 */
	iterations: number;

	/** タイムアウト設定（ms） */
	timeout: number;

	/** メモリ監視有効化 */
	monitorMemory: boolean;
}

export interface BenchmarkResult {
	/** データセットサイズ */
	datasetSize: number;

	/** レンダリング時間（ms） */
	renderTime: {
		min: number;
		max: number;
		avg: number;
		p95: number;
	};

	/** メモリ使用量（MB） */
	memoryUsage: {
		initial: number;
		peak: number;
		final: number;
	};

	/** スクロールパフォーマンス（fps） */
	scrollPerformance: {
		avgFps: number;
		minFps: number;
		frameDrops: number;
	};

	/** ユーザーインタラクション応答時間（ms） */
	interactionLatency: {
		click: number;
		search: number;
		scroll: number;
	};

	/** パフォーマンススコア（0-100） */
	performanceScore: number;

	/** テスト実行時刻 */
	timestamp: string;
}

export interface BenchmarkSuite {
	/** テスト設定 */
	config: BenchmarkConfig;

	/** 全結果 */
	results: BenchmarkResult[];

	/** 概要統計 */
	summary: {
		totalTests: number;
		passedTests: number;
		failedTests: number;
		avgScore: number;
		worstCase: BenchmarkResult;
		bestCase: BenchmarkResult;
	};
}

/**
 * デフォルトベンチマーク設定
 */
export const DEFAULT_BENCHMARK_CONFIG: BenchmarkConfig = {
	datasetSizes: [48, 96, 192, 384], // 標準的な表示数パターン
	iterations: 3,
	timeout: 30000, // 30秒
	monitorMemory: true,
};

/**
 * パフォーマンス基準値（回帰テスト用）
 */
export const PERFORMANCE_THRESHOLDS = {
	/** レンダリング時間の上限（ms） */
	maxRenderTime: {
		small: 100, // 48件まで
		medium: 200, // 96件まで
		large: 400, // 192件まで
		xlarge: 800, // 384件まで
	},

	/** メモリ使用量の上限（MB） */
	maxMemoryUsage: {
		small: 50,
		medium: 100,
		large: 200,
		xlarge: 400,
	},

	/** 最小スクロールFPS */
	minScrollFps: 50,

	/** インタラクション応答時間の上限（ms） */
	maxInteractionLatency: {
		click: 50,
		search: 200,
		scroll: 16, // 60fps相当
	},

	/** 合格スコア */
	passingScore: 70,
} as const;

/**
 * 測定結果を分析してスコアを算出
 */
// Helper function to get data size category
function getDataSizeCategory(datasetSize: number): "small" | "medium" | "large" | "xlarge" {
	if (datasetSize <= 48) return "small";
	if (datasetSize <= 96) return "medium";
	if (datasetSize <= 192) return "large";
	return "xlarge";
}

// Helper function to calculate render score
function calculateRenderScore(avgRenderTime: number, threshold: number): number {
	if (avgRenderTime <= threshold * 0.5) return 30;
	if (avgRenderTime <= threshold) return 20;
	if (avgRenderTime <= threshold * 1.5) return 10;
	return 0;
}

// Helper function to calculate memory score
function calculateMemoryScore(peakMemory: number, threshold: number): number {
	if (peakMemory <= threshold * 0.7) return 25;
	if (peakMemory <= threshold) return 18;
	if (peakMemory <= threshold * 1.3) return 10;
	return 0;
}

// Helper function to calculate scroll score
function calculateScrollScore(avgFps: number): number {
	if (avgFps >= 58) return 25;
	if (avgFps >= PERFORMANCE_THRESHOLDS.minScrollFps) return 18;
	if (avgFps >= 40) return 10;
	return 0;
}

// Helper function to calculate interaction score
function calculateInteractionScore(interactionLatency: {
	click: number;
	search: number;
	scroll: number;
}): number {
	let score = 0;
	if (interactionLatency.click <= PERFORMANCE_THRESHOLDS.maxInteractionLatency.click) score += 7;
	if (interactionLatency.search <= PERFORMANCE_THRESHOLDS.maxInteractionLatency.search) score += 7;
	if (interactionLatency.scroll <= PERFORMANCE_THRESHOLDS.maxInteractionLatency.scroll) score += 6;
	return score;
}

export const calculatePerformanceScore = (
	result: Omit<BenchmarkResult, "performanceScore" | "timestamp">,
): number => {
	const { datasetSize, renderTime, memoryUsage, scrollPerformance, interactionLatency } = result;

	const sizeCategory = getDataSizeCategory(datasetSize);

	let score = 0;

	// レンダリング時間評価（30点）
	score += calculateRenderScore(renderTime.avg, PERFORMANCE_THRESHOLDS.maxRenderTime[sizeCategory]);

	// メモリ使用量評価（25点）
	score += calculateMemoryScore(
		memoryUsage.peak,
		PERFORMANCE_THRESHOLDS.maxMemoryUsage[sizeCategory],
	);

	// スクロールパフォーマンス評価（25点）
	score += calculateScrollScore(scrollPerformance.avgFps);

	// インタラクション応答性評価（20点）
	score += calculateInteractionScore(interactionLatency);

	return Math.min(100, Math.max(0, score));
};

/**
 * ベンチマーク結果の統計分析
 */
export const analyzeBenchmarkResults = (results: BenchmarkResult[]): BenchmarkSuite["summary"] => {
	if (results.length === 0) {
		return {
			totalTests: 0,
			passedTests: 0,
			failedTests: 0,
			avgScore: 0,
			worstCase: {} as BenchmarkResult,
			bestCase: {} as BenchmarkResult,
		};
	}

	const totalTests = results.length;
	const passedTests = results.filter(
		(r) => r.performanceScore >= PERFORMANCE_THRESHOLDS.passingScore,
	).length;
	const failedTests = totalTests - passedTests;

	const avgScore = results.reduce((sum, r) => sum + r.performanceScore, 0) / totalTests;

	const sortedByScore = [...results].sort((a, b) => a.performanceScore - b.performanceScore);
	const worstCase = sortedByScore[0];
	const bestCase = sortedByScore[sortedByScore.length - 1];

	if (!worstCase || !bestCase) {
		throw new Error("No benchmark results to analyze");
	}

	return {
		totalTests,
		passedTests,
		failedTests,
		avgScore,
		worstCase,
		bestCase,
	};
};

/**
 * ベンチマーク結果のMarkdownレポート生成
 */
export const generateBenchmarkReport = (suite: BenchmarkSuite): string => {
	const { config, results, summary } = suite;

	let report = "# 音声ボタンパフォーマンスベンチマーク結果\n\n";
	report += `**実行日時**: ${new Date().toLocaleString("ja-JP")}\n`;
	report += `**テスト設定**: ${config.datasetSizes.join(", ")}件データセット × ${config.iterations}回実行\n\n`;

	// 概要
	report += "## 概要\n\n";
	report += `- **総テスト数**: ${summary.totalTests}\n`;
	report += `- **合格**: ${summary.passedTests} (${((summary.passedTests / summary.totalTests) * 100).toFixed(1)}%)\n`;
	report += `- **不合格**: ${summary.failedTests} (${((summary.failedTests / summary.totalTests) * 100).toFixed(1)}%)\n`;
	report += `- **平均スコア**: ${summary.avgScore.toFixed(1)}/100\n\n`;

	// 詳細結果
	report += "## 詳細結果\n\n";
	report += "| データセット | レンダリング時間 | メモリ使用量 | スクロールFPS | スコア | 結果 |\n";
	report += "|-------------|----------------|-------------|-------------|--------|------|\n";

	for (const result of results) {
		const passed = result.performanceScore >= PERFORMANCE_THRESHOLDS.passingScore;
		report += `| ${result.datasetSize}件 | ${result.renderTime.avg.toFixed(1)}ms | ${result.memoryUsage.peak.toFixed(1)}MB | ${result.scrollPerformance.avgFps.toFixed(1)} | ${result.performanceScore.toFixed(1)} | ${passed ? "✅" : "❌"} |\n`;
	}

	// 推奨事項
	report += "\n## 推奨事項\n\n";

	if (summary.failedTests > 0) {
		report += "### パフォーマンス改善が必要\n\n";

		const worstCase = summary.worstCase;
		if (worstCase.renderTime.avg > PERFORMANCE_THRESHOLDS.maxRenderTime.medium) {
			report += `- レンダリング時間が長すぎます（${worstCase.renderTime.avg.toFixed(1)}ms）。仮想化の最適化を検討してください。\n`;
		}

		if (worstCase.memoryUsage.peak > PERFORMANCE_THRESHOLDS.maxMemoryUsage.medium) {
			report += `- メモリ使用量が多すぎます（${worstCase.memoryUsage.peak.toFixed(1)}MB）。プログレッシブローディングの活用を推奨します。\n`;
		}

		if (worstCase.scrollPerformance.avgFps < PERFORMANCE_THRESHOLDS.minScrollFps) {
			report += `- スクロールパフォーマンスが低下しています（${worstCase.scrollPerformance.avgFps.toFixed(1)}fps）。オーバースキャン設定を見直してください。\n`;
		}
	} else {
		report += "### 優秀なパフォーマンス\n\n";
		report += "全てのテストケースで基準値を上回る優秀な結果です。現在の実装を維持してください。\n";
	}

	return report;
};

/**
 * パフォーマンステスト用のモックデータ生成
 */
export const generateBenchmarkDataset = (size: number): AudioButton[] => {
	return Array.from({ length: size }, (_, index) => ({
		id: `benchmark-${index + 1}`,
		buttonText: `ベンチマークテスト音声 ${index + 1}`,
		description: `パフォーマンステスト用の音声データです。インデックス: ${index + 1}`,
		tags: [`タグ${(index % 5) + 1}`, `カテゴリ${Math.floor(index / 10) + 1}`],
		videoId: `benchmark-video-${index + 1}`,
		videoTitle: `ベンチマーク動画 ${index + 1}`,
		videoThumbnailUrl: `https://example.com/thumb-${index + 1}.jpg`,
		duration: 30,
		startTime: 30 + (index % 60),
		endTime: 60 + (index % 120),
		creatorId: `user-${Math.floor(index / 20) + 1}`,
		creatorName: `ユーザー${Math.floor(index / 20) + 1}`,
		isPublic: true,
		stats: {
			playCount: Math.floor(Math.random() * 1000),
			likeCount: Math.floor(Math.random() * 100),
			dislikeCount: 0,
			favoriteCount: Math.floor(Math.random() * 50),
			engagementRate: Math.random() * 0.3,
		},
		createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date(Date.now() - index * 12 * 60 * 60 * 1000).toISOString(),
		_computed: {
			isPopular: Math.random() > 0.7,
			engagementRate: Math.random() * 0.3,
			engagementRatePercentage: Math.floor(Math.random() * 30),
			popularityScore: Math.floor(Math.random() * 1000),
			searchableText: `ベンチマークテスト音声 ${index + 1} タグ${(index % 5) + 1} カテゴリ${Math.floor(index / 10) + 1} ベンチマーク動画 ${index + 1} ユーザー${Math.floor(index / 20) + 1}`,
			durationText: `${30 + (index % 30)}秒`,
			relativeTimeText: `${index + 1}日前`,
		},
	}));
};

/**
 * ベンチマーク結果の回帰テスト用比較
 */
export const compareWithBaseline = (
	currentResults: BenchmarkResult[],
	baselineResults: BenchmarkResult[],
): {
	regressions: Array<{
		datasetSize: number;
		metric: string;
		current: number;
		baseline: number;
		degradation: number;
	}>;
	improvements: Array<{
		datasetSize: number;
		metric: string;
		current: number;
		baseline: number;
		improvement: number;
	}>;
} => {
	const regressions: Array<{
		datasetSize: number;
		metric: string;
		current: number;
		baseline: number;
		degradation: number;
	}> = [];
	const improvements: Array<{
		datasetSize: number;
		metric: string;
		current: number;
		baseline: number;
		improvement: number;
	}> = [];

	for (const current of currentResults) {
		const baseline = baselineResults.find((b) => b.datasetSize === current.datasetSize);
		if (!baseline) continue;

		// レンダリング時間の比較
		const renderDiff =
			((current.renderTime.avg - baseline.renderTime.avg) / baseline.renderTime.avg) * 100;
		if (renderDiff > 10) {
			// 10%以上の悪化
			regressions.push({
				datasetSize: current.datasetSize,
				metric: "レンダリング時間",
				current: current.renderTime.avg,
				baseline: baseline.renderTime.avg,
				degradation: renderDiff,
			});
		} else if (renderDiff < -10) {
			// 10%以上の改善
			improvements.push({
				datasetSize: current.datasetSize,
				metric: "レンダリング時間",
				current: current.renderTime.avg,
				baseline: baseline.renderTime.avg,
				improvement: Math.abs(renderDiff),
			});
		}

		// メモリ使用量の比較
		const memoryDiff =
			((current.memoryUsage.peak - baseline.memoryUsage.peak) / baseline.memoryUsage.peak) * 100;
		if (memoryDiff > 15) {
			// 15%以上の悪化
			regressions.push({
				datasetSize: current.datasetSize,
				metric: "メモリ使用量",
				current: current.memoryUsage.peak,
				baseline: baseline.memoryUsage.peak,
				degradation: memoryDiff,
			});
		} else if (memoryDiff < -15) {
			// 15%以上の改善
			improvements.push({
				datasetSize: current.datasetSize,
				metric: "メモリ使用量",
				current: current.memoryUsage.peak,
				baseline: baseline.memoryUsage.peak,
				improvement: Math.abs(memoryDiff),
			});
		}
	}

	return { regressions, improvements };
};
