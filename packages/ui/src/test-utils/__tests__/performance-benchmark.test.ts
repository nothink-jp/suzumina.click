/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from "vitest";
import {
	analyzeBenchmarkResults,
	type BenchmarkResult,
	calculatePerformanceScore,
	compareWithBaseline,
	generateBenchmarkDataset,
	generateBenchmarkReport,
	PERFORMANCE_THRESHOLDS,
} from "../performance-benchmark";

// テスト用のモックベンチマーク結果
const createMockBenchmarkResult = (
	datasetSize: number,
	renderTime: number,
	memoryPeak: number,
	avgFps: number,
	clickLatency = 30,
	searchLatency = 100,
	scrollLatency = 10,
): Omit<BenchmarkResult, "performanceScore" | "timestamp"> => ({
	datasetSize,
	renderTime: {
		min: renderTime * 0.8,
		max: renderTime * 1.2,
		avg: renderTime,
		p95: renderTime * 1.1,
	},
	memoryUsage: {
		initial: 20,
		peak: memoryPeak,
		final: memoryPeak * 0.9,
	},
	scrollPerformance: {
		avgFps,
		minFps: avgFps * 0.8,
		frameDrops: avgFps < 50 ? 10 : 2,
	},
	interactionLatency: {
		click: clickLatency,
		search: searchLatency,
		scroll: scrollLatency,
	},
});

describe("calculatePerformanceScore", () => {
	it("should calculate excellent score for optimal performance", () => {
		const result = createMockBenchmarkResult(48, 50, 30, 60, 20, 80, 8);
		const score = calculatePerformanceScore(result);

		expect(score).toBeGreaterThanOrEqual(90);
	});

	it("should calculate good score for acceptable performance", () => {
		const result = createMockBenchmarkResult(96, 150, 70, 55, 40, 150, 15);
		const score = calculatePerformanceScore(result);

		expect(score).toBeGreaterThanOrEqual(70);
		expect(score).toBeLessThan(90);
	});

	it("should calculate poor score for suboptimal performance", () => {
		const result = createMockBenchmarkResult(192, 500, 250, 30, 80, 400, 25);
		const score = calculatePerformanceScore(result);

		expect(score).toBeLessThan(70);
	});

	it("should handle different dataset size categories", () => {
		const smallResult = createMockBenchmarkResult(48, 80, 40, 58);
		const mediumResult = createMockBenchmarkResult(96, 150, 80, 55);
		const largeResult = createMockBenchmarkResult(192, 300, 150, 52);
		const xlargeResult = createMockBenchmarkResult(384, 600, 300, 50);

		const smallScore = calculatePerformanceScore(smallResult);
		const mediumScore = calculatePerformanceScore(mediumResult);
		const largeScore = calculatePerformanceScore(largeResult);
		const xlargeScore = calculatePerformanceScore(xlargeResult);

		// より小さなデータセットの方が一般的に高いスコアを得られる
		expect(smallScore).toBeGreaterThanOrEqual(mediumScore);
		expect(mediumScore).toBeGreaterThanOrEqual(largeScore);
		expect(largeScore).toBeGreaterThanOrEqual(xlargeScore);
	});

	it("should cap score at 100", () => {
		const perfectResult = createMockBenchmarkResult(48, 10, 10, 60, 5, 20, 5);
		const score = calculatePerformanceScore(perfectResult);

		expect(score).toBeLessThanOrEqual(100);
	});

	it("should not go below 0", () => {
		const terribleResult = createMockBenchmarkResult(384, 2000, 1000, 10, 200, 1000, 50);
		const score = calculatePerformanceScore(terribleResult);

		expect(score).toBeGreaterThanOrEqual(0);
	});
});

describe("analyzeBenchmarkResults", () => {
	it("should analyze results correctly", () => {
		const results: BenchmarkResult[] = [
			{
				...createMockBenchmarkResult(48, 80, 40, 58),
				performanceScore: 85,
				timestamp: "2025-01-01T00:00:00Z",
			},
			{
				...createMockBenchmarkResult(96, 150, 80, 55),
				performanceScore: 75,
				timestamp: "2025-01-01T00:01:00Z",
			},
			{
				...createMockBenchmarkResult(192, 400, 200, 45),
				performanceScore: 60,
				timestamp: "2025-01-01T00:02:00Z",
			},
		];

		const summary = analyzeBenchmarkResults(results);

		expect(summary.totalTests).toBe(3);
		expect(summary.passedTests).toBe(2); // スコア70以上
		expect(summary.failedTests).toBe(1);
		expect(summary.avgScore).toBeCloseTo(73.33, 1);
		expect(summary.worstCase.performanceScore).toBe(60);
		expect(summary.bestCase.performanceScore).toBe(85);
	});

	it("should handle empty results", () => {
		const summary = analyzeBenchmarkResults([]);

		expect(summary.totalTests).toBe(0);
		expect(summary.passedTests).toBe(0);
		expect(summary.failedTests).toBe(0);
		expect(summary.avgScore).toBe(0);
	});

	it("should identify pass/fail based on threshold", () => {
		const results: BenchmarkResult[] = [
			{
				...createMockBenchmarkResult(48, 80, 40, 58),
				performanceScore: PERFORMANCE_THRESHOLDS.passingScore + 5,
				timestamp: "2025-01-01T00:00:00Z",
			},
			{
				...createMockBenchmarkResult(96, 150, 80, 55),
				performanceScore: PERFORMANCE_THRESHOLDS.passingScore - 5,
				timestamp: "2025-01-01T00:01:00Z",
			},
		];

		const summary = analyzeBenchmarkResults(results);

		expect(summary.passedTests).toBe(1);
		expect(summary.failedTests).toBe(1);
	});
});

describe("generateBenchmarkReport", () => {
	it("should generate proper markdown report", () => {
		const results: BenchmarkResult[] = [
			{
				...createMockBenchmarkResult(48, 80, 40, 58),
				performanceScore: 85,
				timestamp: "2025-01-01T00:00:00Z",
			},
			{
				...createMockBenchmarkResult(96, 150, 80, 55),
				performanceScore: 65,
				timestamp: "2025-01-01T00:01:00Z",
			},
		];

		const suite = {
			config: {
				datasetSizes: [48, 96],
				iterations: 3,
				timeout: 30000,
				monitorMemory: true,
			},
			results,
			summary: analyzeBenchmarkResults(results),
		};

		const report = generateBenchmarkReport(suite);

		expect(report).toContain("# 音声ボタンパフォーマンスベンチマーク結果");
		expect(report).toContain("48, 96件データセット × 3回実行");
		expect(report).toContain(
			"| データセット | レンダリング時間 | メモリ使用量 | スクロールFPS | スコア | 結果 |",
		);
		expect(report).toContain("48件");
		expect(report).toContain("96件");
		expect(report).toContain("✅");
		expect(report).toContain("❌");
	});

	it("should include performance recommendations", () => {
		const results: BenchmarkResult[] = [
			{
				...createMockBenchmarkResult(96, 500, 200, 30),
				performanceScore: 40,
				timestamp: "2025-01-01T00:00:00Z",
			},
		];

		const suite = {
			config: {
				datasetSizes: [96],
				iterations: 1,
				timeout: 30000,
				monitorMemory: true,
			},
			results,
			summary: analyzeBenchmarkResults(results),
		};

		const report = generateBenchmarkReport(suite);

		expect(report).toContain("## 推奨事項");
		expect(report).toContain("パフォーマンス改善が必要");
	});

	it("should show success message for good performance", () => {
		const results: BenchmarkResult[] = [
			{
				...createMockBenchmarkResult(96, 100, 60, 58),
				performanceScore: 85,
				timestamp: "2025-01-01T00:00:00Z",
			},
		];

		const suite = {
			config: {
				datasetSizes: [96],
				iterations: 1,
				timeout: 30000,
				monitorMemory: true,
			},
			results,
			summary: analyzeBenchmarkResults(results),
		};

		const report = generateBenchmarkReport(suite);

		expect(report).toContain("優秀なパフォーマンス");
		expect(report).toContain("全てのテストケースで基準値を上回る");
	});
});

describe("generateBenchmarkDataset", () => {
	it("should generate correct number of items", () => {
		const dataset = generateBenchmarkDataset(50);
		expect(dataset).toHaveLength(50);
	});

	it("should generate items with correct structure", () => {
		const dataset = generateBenchmarkDataset(5);

		for (const item of dataset) {
			expect(item).toHaveProperty("id");
			expect(item).toHaveProperty("title");
			expect(item).toHaveProperty("description");
			expect(item).toHaveProperty("tags");
			expect(item).toHaveProperty("sourceVideoId");
			expect(item.id).toMatch(/^benchmark-\d+$/);
			expect(typeof item.title).toBe("string");
			expect(Array.isArray(item.tags)).toBe(true);
		}
	});

	it("should generate unique IDs", () => {
		const dataset = generateBenchmarkDataset(10);
		const ids = dataset.map((item) => item.id);
		const uniqueIds = new Set(ids);

		expect(uniqueIds.size).toBe(ids.length);
	});

	it("should generate realistic data patterns", () => {
		const dataset = generateBenchmarkDataset(100);

		// タグの多様性をチェック
		const allTags = new Set(dataset.flatMap((item) => item.tags));
		expect(allTags.size).toBeGreaterThan(10);

		// 時間の妥当性をチェック
		for (const item of dataset) {
			expect(item.startTime).toBeGreaterThan(0);
			expect(item.endTime).toBeGreaterThan(item.startTime);
		}
	});
});

describe("compareWithBaseline", () => {
	it("should detect regressions", () => {
		const baseline: BenchmarkResult[] = [
			{
				...createMockBenchmarkResult(96, 100, 60, 58),
				performanceScore: 80,
				timestamp: "2025-01-01T00:00:00Z",
			},
		];

		const current: BenchmarkResult[] = [
			{
				...createMockBenchmarkResult(96, 150, 80, 58),
				performanceScore: 70,
				timestamp: "2025-01-02T00:00:00Z",
			},
		];

		const comparison = compareWithBaseline(current, baseline);

		expect(comparison.regressions).toHaveLength(2); // レンダリング時間とメモリ使用量の悪化
		expect(comparison.regressions[0]?.metric).toBe("レンダリング時間");
		expect(comparison.regressions[0]?.degradation).toBeGreaterThan(10);
		expect(comparison.regressions[1]?.metric).toBe("メモリ使用量");
		expect(comparison.regressions[1]?.degradation).toBeGreaterThan(15);
	});

	it("should detect improvements", () => {
		const baseline: BenchmarkResult[] = [
			{
				...createMockBenchmarkResult(96, 200, 100, 50),
				performanceScore: 60,
				timestamp: "2025-01-01T00:00:00Z",
			},
		];

		const current: BenchmarkResult[] = [
			{
				...createMockBenchmarkResult(96, 100, 60, 58),
				performanceScore: 80,
				timestamp: "2025-01-02T00:00:00Z",
			},
		];

		const comparison = compareWithBaseline(current, baseline);

		expect(comparison.improvements).toHaveLength(2); // レンダリング時間とメモリ使用量の改善
		expect(comparison.improvements[0]?.metric).toBe("レンダリング時間");
		expect(comparison.improvements[0]?.improvement).toBeGreaterThan(10);
		expect(comparison.improvements[1]?.metric).toBe("メモリ使用量");
		expect(comparison.improvements[1]?.improvement).toBeGreaterThan(15);
	});

	it("should handle missing baseline data", () => {
		const baseline: BenchmarkResult[] = [
			{
				...createMockBenchmarkResult(48, 100, 60, 58),
				performanceScore: 80,
				timestamp: "2025-01-01T00:00:00Z",
			},
		];

		const current: BenchmarkResult[] = [
			{
				...createMockBenchmarkResult(96, 150, 80, 58),
				performanceScore: 70,
				timestamp: "2025-01-02T00:00:00Z",
			},
		];

		const comparison = compareWithBaseline(current, baseline);

		expect(comparison.regressions).toHaveLength(0);
		expect(comparison.improvements).toHaveLength(0);
	});

	it("should ignore minor changes", () => {
		const baseline: BenchmarkResult[] = [
			{
				...createMockBenchmarkResult(96, 100, 60, 58),
				performanceScore: 80,
				timestamp: "2025-01-01T00:00:00Z",
			},
		];

		const current: BenchmarkResult[] = [
			{
				...createMockBenchmarkResult(96, 105, 62, 57),
				performanceScore: 78,
				timestamp: "2025-01-02T00:00:00Z",
			},
		];

		const comparison = compareWithBaseline(current, baseline);

		expect(comparison.regressions).toHaveLength(0);
		expect(comparison.improvements).toHaveLength(0);
	});
});
