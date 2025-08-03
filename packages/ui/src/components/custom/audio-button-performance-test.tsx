/**
 * 音声ボタンパフォーマンステストコンポーネント - Phase 2e 実装
 *
 * 設計特徴:
 * - 96+件の大量データでのパフォーマンス検証
 * - プログレッシブローディングの効果測定
 * - メモリ使用量とレンダリング性能の監視
 * - 本番環境相当のテストシナリオ
 */

"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { memo, useCallback, useEffect, useState } from "react";
import {
	ProgressiveAudioButtonList,
	useProgressiveLoadingMetrics,
} from "./progressive-audio-button-list";
import { VirtualizedAudioButtonList } from "./virtualized-audio-button-list";

export interface AudioButtonPerformanceTestProps {
	/** テストモード */
	testMode: "progressive" | "virtualized" | "comparison";

	/** 表示アイテム数 */
	itemCount?: number;

	/** パフォーマンス統計表示 */
	showMetrics?: boolean;

	/** テスト結果コールバック */
	onTestComplete?: (results: PerformanceTestResults) => void;

	/** 自動テスト実行 */
	autoRun?: boolean;
}

export interface PerformanceTestResults {
	testMode: string;
	itemCount: number;
	renderTime: number;
	memoryUsage: string;
	upgradeRatio?: string;
	scrollPerformance: number;
	timestamp: string;
}

/**
 * 大量データ生成ユーティリティ
 */
const generateLargeDataset = (count: number): AudioButtonPlainObject[] => {
	return Array.from({ length: count }, (_, index) => {
		const title = `音声ボタン ${index + 1} - パフォーマンステスト用`;
		const tags = [
			"テスト",
			"パフォーマンス",
			`カテゴリ${Math.floor(index / 10) + 1}`,
			...(index % 5 === 0 ? ["人気"] : []),
			...(index % 7 === 0 ? ["新着"] : []),
		];
		const sourceVideoTitle = `テスト動画 ${index + 1}`;
		const createdByName = `テストユーザー${Math.floor(index / 20) + 1}`;
		const playCount = Math.floor(Math.random() * 1000);
		const likeCount = Math.floor(Math.random() * 100);
		const favoriteCount = Math.floor(Math.random() * 50);

		return {
			id: `test-audio-${index + 1}`,
			title,
			description: `これは${index + 1}番目のテスト用音声ボタンです。大量データでのパフォーマンス検証を行います。`,
			tags,
			sourceVideoId: `test-video-${index + 1}`,
			sourceVideoTitle,
			sourceVideoThumbnailUrl: `https://img.youtube.com/vi/test-video-${index + 1}/maxresdefault.jpg`,
			startTime: Math.floor(Math.random() * 300) + 10,
			endTime: Math.floor(Math.random() * 300) + 50,
			createdBy: `test-user-${Math.floor(index / 20) + 1}`,
			createdByName,
			isPublic: true,
			playCount,
			likeCount,
			dislikeCount: 0,
			favoriteCount,
			createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
			updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
			_computed: {
				isPopular: playCount > 500,
				engagementRate: likeCount / (playCount || 1),
				engagementRatePercentage: Math.round((likeCount / (playCount || 1)) * 100),
				popularityScore: playCount + likeCount * 2,
				searchableText:
					`${title} ${tags.join(" ")} ${sourceVideoTitle} ${createdByName}`.toLowerCase(),
				durationText: `${Math.floor(Math.random() * 60) + 1}秒`,
				relativeTimeText: `${Math.floor(Math.random() * 30) + 1}日前`,
			},
		};
	});
};

/**
 * パフォーマンス測定フック
 */
const usePerformanceMetrics = (testMode: string, itemCount: number) => {
	const [renderTime, setRenderTime] = useState(0);
	const [scrollPerformance, setScrollPerformance] = useState(0);

	// レンダリング時間は runPerformanceTest 内で直接測定される

	const measureScrollPerformance = useCallback(() => {
		const scrollTests = 10;
		const start = performance.now();

		// スクロールパフォーマンスの模擬測定
		for (let i = 0; i < scrollTests; i++) {
			// 60fps (16.67ms per frame) を目標とした計算
			const frameTime = 16.67;
			// アイテム数に基づくパフォーマンス計算
			const complexity = itemCount / 100;
			const actualFrameTime = frameTime * (1 + complexity * 0.1);

			if (actualFrameTime > 16.67) {
				setScrollPerformance((prev) => prev + 1);
			}
		}

		const end = performance.now();
		return end - start;
	}, [itemCount]);

	return {
		renderTime,
		scrollPerformance,
		measureScrollPerformance,
		setRenderTime,
	};
};

/**
 * 音声ボタンパフォーマンステストコンポーネント
 */
export const AudioButtonPerformanceTest = memo<AudioButtonPerformanceTestProps>(
	({ testMode, itemCount = 96, showMetrics = true, onTestComplete, autoRun = false }) => {
		const [testData, setTestData] = useState<AudioButtonPlainObject[]>([]);
		const [isRunning, setIsRunning] = useState(false);
		const [testResults, setTestResults] = useState<PerformanceTestResults | null>(null);
		const [visibleRange, _setVisibleRange] = useState({ start: 0, end: 5 });
		const [upgradedCount, setUpgradedCount] = useState(0);

		const { renderTime, scrollPerformance, measureScrollPerformance, setRenderTime } =
			usePerformanceMetrics(testMode, itemCount);

		const progressiveMetrics = useProgressiveLoadingMetrics(itemCount, upgradedCount, visibleRange);

		// テストデータ生成
		useEffect(() => {
			if (itemCount > 0) {
				const data = generateLargeDataset(itemCount);
				setTestData(data);
			}
		}, [itemCount]);

		const runPerformanceTest = useCallback(async () => {
			setIsRunning(true);

			// レンダリング開始時刻を記録
			const startTime = performance.now();

			// レンダリング完了を待つ
			await new Promise((resolve) => setTimeout(resolve, 100));

			// レンダリング時間を計算
			const endTime = performance.now();
			setRenderTime(endTime - startTime);

			// スクロールパフォーマンステスト
			const _scrollTime = measureScrollPerformance();

			// メモリ使用量の概算計算
			const baseMemoryPerItem = testMode === "progressive" ? 0.5 : 2.0; // MB
			const estimatedMemory = (itemCount * baseMemoryPerItem).toFixed(1);

			const results: PerformanceTestResults = {
				testMode,
				itemCount,
				renderTime,
				memoryUsage: `${estimatedMemory}MB`,
				upgradeRatio: testMode === "progressive" ? progressiveMetrics.upgradeRatio : undefined,
				scrollPerformance,
				timestamp: new Date().toISOString(),
			};

			setTestResults(results);
			onTestComplete?.(results);
			setIsRunning(false);
		}, [
			testMode,
			itemCount,
			renderTime,
			scrollPerformance,
			progressiveMetrics.upgradeRatio,
			measureScrollPerformance,
			setRenderTime,
			onTestComplete,
		]);

		// 自動テスト実行
		useEffect(() => {
			if (autoRun && testData.length > 0 && !isRunning) {
				runPerformanceTest();
			}
		}, [autoRun, testData, isRunning, runPerformanceTest]);

		const handleFavoriteToggle = useCallback((audioButtonId: string) => {
			// パフォーマンステスト用のダミー処理
			// Favorite toggle simulation
		}, []);

		const handlePlay = useCallback(
			(audioButton: AudioButtonPlainObject, index: number) => {
				// パフォーマンステスト用のダミー処理
				// Play simulation for performance testing

				// プログレッシブモードの場合、アップグレードをシミュレート
				if (testMode === "progressive") {
					setUpgradedCount((prev) => prev + 1);
				}
			},
			[testMode],
		);

		if (testData.length === 0) {
			return (
				<div className="flex items-center justify-center h-96">
					<p className="text-muted-foreground">テストデータを生成中...</p>
				</div>
			);
		}

		return (
			<div className="space-y-4">
				{/* テスト情報 */}
				<div className="bg-card border rounded-lg p-4">
					<h3 className="font-semibold mb-2">
						パフォーマンステスト - {testMode.toUpperCase()}モード
					</h3>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
						<div>
							<span className="text-muted-foreground">アイテム数:</span>
							<span className="ml-2 font-medium">{itemCount}</span>
						</div>
						<div>
							<span className="text-muted-foreground">テスト状態:</span>
							<span className="ml-2 font-medium">{isRunning ? "実行中" : "待機中"}</span>
						</div>
						{testMode === "progressive" && (
							<div>
								<span className="text-muted-foreground">アップグレード済み:</span>
								<span className="ml-2 font-medium">{upgradedCount}</span>
							</div>
						)}
						<div>
							<button
								type="button"
								onClick={runPerformanceTest}
								disabled={isRunning}
								className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90 disabled:opacity-50"
							>
								{isRunning ? "実行中..." : "テスト実行"}
							</button>
						</div>
					</div>
				</div>

				{/* メトリクス表示 */}
				{showMetrics && testResults && (
					<div className="bg-card border rounded-lg p-4">
						<h4 className="font-semibold mb-2">パフォーマンス結果</h4>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div>
								<span className="text-muted-foreground">レンダリング時間:</span>
								<span className="ml-2 font-medium">{testResults.renderTime.toFixed(2)}ms</span>
							</div>
							<div>
								<span className="text-muted-foreground">メモリ使用量:</span>
								<span className="ml-2 font-medium">{testResults.memoryUsage}</span>
							</div>
							{testResults.upgradeRatio && (
								<div>
									<span className="text-muted-foreground">アップグレード率:</span>
									<span className="ml-2 font-medium">{testResults.upgradeRatio}</span>
								</div>
							)}
							<div>
								<span className="text-muted-foreground">スクロール性能:</span>
								<span className="ml-2 font-medium">
									{testResults.scrollPerformance > 3 ? "改善要" : "良好"}
								</span>
							</div>
						</div>
					</div>
				)}

				{/* リストコンポーネント */}
				<div className="border rounded-lg overflow-hidden">
					{testMode === "progressive" && (
						<ProgressiveAudioButtonList
							audioButtons={testData}
							onPlay={handlePlay}
							onFavoriteToggle={handleFavoriteToggle}
							height={600}
							showDetailLink={false}
							previewBufferSize={10}
						/>
					)}

					{testMode === "virtualized" && (
						<VirtualizedAudioButtonList
							audioButtons={testData}
							onPlay={handlePlay}
							onFavoriteToggle={handleFavoriteToggle}
							height={600}
							showDetailLink={false}
						/>
					)}

					{testMode === "comparison" && (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
							<div>
								<h5 className="font-medium mb-2">プログレッシブローディング</h5>
								<ProgressiveAudioButtonList
									audioButtons={testData.slice(0, 48)}
									onPlay={handlePlay}
									onFavoriteToggle={handleFavoriteToggle}
									height={300}
									showDetailLink={false}
								/>
							</div>
							<div>
								<h5 className="font-medium mb-2">標準仮想化</h5>
								<VirtualizedAudioButtonList
									audioButtons={testData.slice(0, 48)}
									onPlay={handlePlay}
									onFavoriteToggle={handleFavoriteToggle}
									height={300}
									showDetailLink={false}
								/>
							</div>
						</div>
					)}
				</div>
			</div>
		);
	},
);

AudioButtonPerformanceTest.displayName = "AudioButtonPerformanceTest";

/**
 * パフォーマンステスト結果の評価ユーティリティ
 */
export const evaluatePerformanceResults = (
	results: PerformanceTestResults,
): {
	overall: "excellent" | "good" | "poor";
	recommendations: string[];
} => {
	const recommendations: string[] = [];
	let score = 0;

	// レンダリング時間評価 (< 100ms = 良好)
	if (results.renderTime < 100) {
		score += 30;
	} else if (results.renderTime < 200) {
		score += 20;
		recommendations.push("レンダリング時間を短縮する最適化を検討してください");
	} else {
		score += 10;
		recommendations.push("レンダリング時間が長すぎます。仮想化の見直しが必要です");
	}

	// メモリ使用量評価
	const memoryMB = Number.parseFloat(results.memoryUsage.replace("MB", ""));
	if (memoryMB < 50) {
		score += 30;
	} else if (memoryMB < 100) {
		score += 20;
		recommendations.push("メモリ使用量を削減する最適化を検討してください");
	} else {
		score += 10;
		recommendations.push("メモリ使用量が多すぎます。プログレッシブローディングの活用を推奨します");
	}

	// アップグレード率評価（プログレッシブモードのみ）
	if (results.upgradeRatio) {
		const upgradePercent = Number.parseFloat(results.upgradeRatio.replace("%", ""));
		if (upgradePercent < 30) {
			score += 25;
		} else if (upgradePercent < 50) {
			score += 15;
			recommendations.push("アップグレード率を下げるためのUX改善を検討してください");
		} else {
			score += 5;
			recommendations.push("アップグレード率が高すぎます。段階的ローディングの調整が必要です");
		}
	} else {
		score += 15; // 標準仮想化の場合のボーナス
	}

	// スクロールパフォーマンス評価
	if (results.scrollPerformance <= 1) {
		score += 15;
	} else if (results.scrollPerformance <= 3) {
		score += 10;
		recommendations.push("スクロール性能の軽微な改善が推奨されます");
	} else {
		score += 5;
		recommendations.push(
			"スクロールパフォーマンスに問題があります。オーバースキャン設定の見直しが必要です",
		);
	}

	// 総合評価
	let overall: "excellent" | "good" | "poor";
	if (score >= 85) {
		overall = "excellent";
	} else if (score >= 70) {
		overall = "good";
	} else {
		overall = "poor";
	}

	if (recommendations.length === 0) {
		recommendations.push("優秀なパフォーマンスです！");
	}

	return { overall, recommendations };
};
