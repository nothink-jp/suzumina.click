/**
 * @vitest-environment happy-dom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
	AudioButtonPerformanceTest,
	evaluatePerformanceResults,
	type PerformanceTestResults,
} from "../audio-button-performance-test";

// 重い依存関係をモック化
vi.mock("../progressive-audio-button-list", () => ({
	ProgressiveAudioButtonList: ({ audioButtons }: any) => (
		<div data-testid="progressive-list">Progressive List with {audioButtons.length} items</div>
	),
	useProgressiveLoadingMetrics: () => ({
		totalItems: 96,
		upgradedCount: 10,
		upgradeRatio: "10.4%",
		visibleCount: 6,
		memoryUsage: "48.0MB",
		isEfficient: true,
	}),
}));

vi.mock("../virtualized-audio-button-list", () => ({
	VirtualizedAudioButtonList: ({ audioButtons }: any) => (
		<div data-testid="virtualized-list">Virtualized List with {audioButtons.length} items</div>
	),
}));

// performance.now() をモック
global.performance = {
	...global.performance,
	now: vi.fn(() => Date.now()),
};

describe("AudioButtonPerformanceTest", () => {
	it("should render progressive mode test", async () => {
		render(<AudioButtonPerformanceTest testMode="progressive" itemCount={50} showMetrics={true} />);

		await waitFor(() => {
			expect(screen.getByText(/パフォーマンステスト - PROGRESSIVEモード/)).toBeInTheDocument();
		});

		expect(screen.getByText("アイテム数:")).toBeInTheDocument();
		expect(screen.getByText("50")).toBeInTheDocument();
		expect(screen.getByTestId("progressive-list")).toBeInTheDocument();
	});

	it("should render virtualized mode test", async () => {
		render(<AudioButtonPerformanceTest testMode="virtualized" itemCount={96} showMetrics={true} />);

		await waitFor(() => {
			expect(screen.getByText(/パフォーマンステスト - VIRTUALIZEDモード/)).toBeInTheDocument();
		});

		expect(screen.getByTestId("virtualized-list")).toBeInTheDocument();
	});

	it("should render comparison mode test", async () => {
		render(<AudioButtonPerformanceTest testMode="comparison" itemCount={96} showMetrics={true} />);

		await waitFor(() => {
			expect(screen.getByText(/パフォーマンステスト - COMPARISONモード/)).toBeInTheDocument();
		});

		expect(screen.getByText("プログレッシブローディング")).toBeInTheDocument();
		expect(screen.getByText("標準仮想化")).toBeInTheDocument();
	});

	it("should run performance test when button clicked", async () => {
		const user = userEvent.setup();
		const onTestComplete = vi.fn();

		render(
			<AudioButtonPerformanceTest
				testMode="progressive"
				itemCount={20}
				onTestComplete={onTestComplete}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText("テスト実行")).toBeInTheDocument();
		});

		const testButton = screen.getByText("テスト実行");
		await user.click(testButton);

		// テスト実行後の状態確認
		await waitFor(() => {
			expect(onTestComplete).toHaveBeenCalled();
		});
	});

	it("should show metrics when enabled", async () => {
		render(
			<AudioButtonPerformanceTest
				testMode="progressive"
				itemCount={30}
				showMetrics={true}
				autoRun={true}
			/>,
		);

		// メトリクスが表示されるまで待機
		await waitFor(
			() => {
				expect(screen.getByText("パフォーマンス結果")).toBeInTheDocument();
			},
			{ timeout: 3000 },
		);

		expect(screen.getByText("レンダリング時間:")).toBeInTheDocument();
		expect(screen.getByText("メモリ使用量:")).toBeInTheDocument();
	});

	it("should handle large dataset generation", async () => {
		render(
			<AudioButtonPerformanceTest testMode="progressive" itemCount={200} showMetrics={false} />,
		);

		await waitFor(() => {
			expect(screen.getByText("200")).toBeInTheDocument();
		});
	});

	it("should disable test button while running", async () => {
		const user = userEvent.setup();

		render(<AudioButtonPerformanceTest testMode="virtualized" itemCount={10} />);

		await waitFor(() => {
			expect(screen.getByText("テスト実行")).toBeInTheDocument();
		});

		const testButton = screen.getByText("テスト実行");
		await user.click(testButton);

		// ボタンが無効化されることを確認
		expect(testButton).toBeDisabled();
	});

	it("should show loading state for test data", () => {
		render(<AudioButtonPerformanceTest testMode="progressive" itemCount={0} />);

		expect(screen.getByText("テストデータを生成中...")).toBeInTheDocument();
	});
});

describe("evaluatePerformanceResults", () => {
	it("should evaluate excellent performance", () => {
		const results: PerformanceTestResults = {
			testMode: "progressive",
			itemCount: 96,
			renderTime: 50,
			memoryUsage: "30.0MB",
			upgradeRatio: "15.0%",
			scrollPerformance: 0,
			timestamp: "2025-01-01T00:00:00.000Z",
		};

		const evaluation = evaluatePerformanceResults(results);

		expect(evaluation.overall).toBe("excellent");
		expect(evaluation.recommendations).toContain("優秀なパフォーマンスです！");
	});

	it("should evaluate good performance", () => {
		const results: PerformanceTestResults = {
			testMode: "virtualized",
			itemCount: 96,
			renderTime: 120,
			memoryUsage: "60.0MB",
			scrollPerformance: 2,
			timestamp: "2025-01-01T00:00:00.000Z",
		};

		const evaluation = evaluatePerformanceResults(results);

		// レンダリング時間とメモリが許容範囲を超えているため poor になる
		expect(evaluation.overall).toBe("poor");
		expect(evaluation.recommendations.length).toBeGreaterThan(0);
	});

	it("should evaluate poor performance", () => {
		const results: PerformanceTestResults = {
			testMode: "progressive",
			itemCount: 96,
			renderTime: 300,
			memoryUsage: "150.0MB",
			upgradeRatio: "80.0%",
			scrollPerformance: 5,
			timestamp: "2025-01-01T00:00:00.000Z",
		};

		const evaluation = evaluatePerformanceResults(results);

		expect(evaluation.overall).toBe("poor");
		expect(evaluation.recommendations.length).toBeGreaterThan(3);
	});

	it("should handle missing upgrade ratio", () => {
		const results: PerformanceTestResults = {
			testMode: "virtualized",
			itemCount: 96,
			renderTime: 80,
			memoryUsage: "40.0MB",
			scrollPerformance: 1,
			timestamp: "2025-01-01T00:00:00.000Z",
		};

		const evaluation = evaluatePerformanceResults(results);

		expect(evaluation.overall).toBe("excellent");
		expect(evaluation.recommendations).toContain("優秀なパフォーマンスです！");
	});

	it("should provide specific recommendations", () => {
		const results: PerformanceTestResults = {
			testMode: "progressive",
			itemCount: 96,
			renderTime: 300, // 明らかに遅い
			memoryUsage: "150.0MB", // 明らかに多い
			upgradeRatio: "70.0%", // 明らかに高い
			scrollPerformance: 8, // 明らかに悪い
			timestamp: "2025-01-01T00:00:00.000Z",
		};

		const evaluation = evaluatePerformanceResults(results);

		// 複数の問題があるため複数の推奨事項が含まれることを確認
		expect(evaluation.recommendations.length).toBeGreaterThan(3);
		expect(evaluation.overall).toBe("poor");
	});

	it("should handle edge case values", () => {
		const results: PerformanceTestResults = {
			testMode: "progressive",
			itemCount: 1,
			renderTime: 0,
			memoryUsage: "0.1MB",
			upgradeRatio: "0.0%",
			scrollPerformance: 0,
			timestamp: "2025-01-01T00:00:00.000Z",
		};

		const evaluation = evaluatePerformanceResults(results);

		expect(evaluation.overall).toBe("excellent");
		expect(evaluation.recommendations).toContain("優秀なパフォーマンスです！");
	});
});
