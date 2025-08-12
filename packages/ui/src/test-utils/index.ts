/**
 * テストユーティリティ集約エクスポート
 *
 * パフォーマンステスト・ベンチマーク関連のユーティリティを
 * 開発・テスト環境でのみ利用可能にする
 */

// Benchmark utilities (開発環境専用)
export {
	analyzeBenchmarkResults,
	type BenchmarkConfig,
	type BenchmarkResult,
	type BenchmarkSuite,
	calculatePerformanceScore,
	compareWithBaseline,
	generateBenchmarkDataset,
	generateBenchmarkReport,
	PERFORMANCE_THRESHOLDS,
} from "./performance-benchmark";
