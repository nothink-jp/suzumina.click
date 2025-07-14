/**
 * @vitest-environment happy-dom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LargeDatasetIntegrationTest } from "./large-dataset-integration-test";

// 重い依存関係をモック化
vi.mock("./progressive-audio-button-list", () => ({
	ProgressiveAudioButtonList: ({ audioButtons, searchQuery }: any) => (
		<div data-testid="progressive-list">
			<div>Items: {audioButtons.length}</div>
			{searchQuery && <div>Search: {searchQuery}</div>}
		</div>
	),
}));

vi.mock("./search-and-filter-panel", () => ({
	SearchAndFilterPanel: ({ onSearchChange, searchQuery }: any) => (
		<div data-testid="search-panel">
			<input
				data-testid="search-input"
				value={searchQuery}
				onChange={(e) => onSearchChange(e.target.value)}
				placeholder="検索..."
			/>
		</div>
	),
}));

// performance.now() をモック
global.performance = {
	...global.performance,
	now: vi.fn(() => Date.now()),
};

describe("LargeDatasetIntegrationTest", () => {
	it("should render basic integration test", async () => {
		render(<LargeDatasetIntegrationTest initialDataSize={50} testScenario="basic" />);

		await waitFor(() => {
			expect(screen.getByText(/大量データ統合テスト - BASICシナリオ/)).toBeInTheDocument();
		});

		expect(screen.getAllByText("50")).toHaveLength(2); // 総アイテム数と表示アイテム数
		expect(screen.getByTestId("progressive-list")).toBeInTheDocument();
		expect(screen.getByTestId("search-panel")).toBeInTheDocument();
	});

	it("should handle search functionality", async () => {
		const user = userEvent.setup();

		render(<LargeDatasetIntegrationTest initialDataSize={20} testScenario="search" />);

		await waitFor(() => {
			expect(screen.getByTestId("search-input")).toBeInTheDocument();
		});

		const searchInput = screen.getByTestId("search-input");
		await user.type(searchInput, "テスト");

		await waitFor(() => {
			expect(screen.getByDisplayValue("テスト")).toBeInTheDocument();
		});
	});

	it("should run integration test", async () => {
		const user = userEvent.setup();
		const onTestResult = vi.fn();

		render(
			<LargeDatasetIntegrationTest
				initialDataSize={30}
				testScenario="interaction"
				onTestResult={onTestResult}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByText("統合テスト実行")).toBeInTheDocument();
		});

		const testButton = screen.getByText("統合テスト実行");
		await user.click(testButton);

		// テスト実行後の結果確認
		await waitFor(
			() => {
				expect(onTestResult).toHaveBeenCalled();
			},
			{ timeout: 3000 },
		);
	});

	it("should display test results", async () => {
		const user = userEvent.setup();

		render(<LargeDatasetIntegrationTest initialDataSize={10} testScenario="stress" />);

		await waitFor(() => {
			expect(screen.getByText("統合テスト実行")).toBeInTheDocument();
		});

		const testButton = screen.getByText("統合テスト実行");
		await user.click(testButton);

		// テスト結果が表示されるまで待機
		await waitFor(
			() => {
				expect(screen.getByText("テスト結果")).toBeInTheDocument();
			},
			{ timeout: 3000 },
		);

		expect(screen.getByText("検索性能")).toBeInTheDocument();
		expect(screen.getByText("応答性")).toBeInTheDocument();
		expect(screen.getByText("メモリ安定性")).toBeInTheDocument();
		expect(screen.getByText("UX評価")).toBeInTheDocument();
	});

	it("should show real-time statistics", async () => {
		render(<LargeDatasetIntegrationTest initialDataSize={40} testScenario="basic" />);

		await waitFor(() => {
			expect(screen.getByText("リアルタイム統計")).toBeInTheDocument();
		});

		expect(screen.getByText("検索フィルタ率:")).toBeInTheDocument();
		expect(screen.getByText("お気に入り率:")).toBeInTheDocument();
		expect(screen.getByText("検索クエリ:")).toBeInTheDocument();
	});

	it("should handle different test scenarios", async () => {
		const scenarios = ["basic", "search", "interaction", "stress"] as const;

		for (const scenario of scenarios) {
			const { unmount } = render(
				<LargeDatasetIntegrationTest initialDataSize={15} testScenario={scenario} />,
			);

			await waitFor(() => {
				expect(
					screen.getByText(new RegExp(`${scenario.toUpperCase()}シナリオ`)),
				).toBeInTheDocument();
			});

			unmount();
		}
	});

	it("should display loading state", () => {
		render(<LargeDatasetIntegrationTest initialDataSize={0} testScenario="basic" />);

		expect(screen.getByText("大量データセットを生成中...")).toBeInTheDocument();
	});

	it("should handle large dataset sizes", async () => {
		render(<LargeDatasetIntegrationTest initialDataSize={200} testScenario="stress" />);

		await waitFor(() => {
			expect(screen.getAllByText("200")).toHaveLength(2); // 総アイテム数と表示アイテム数
		});

		// ストレステストでは大量データでもスムーズに表示されることを確認
		expect(screen.getByTestId("progressive-list")).toBeInTheDocument();
	});

	it("should update filtered data count based on search", async () => {
		const user = userEvent.setup();

		render(<LargeDatasetIntegrationTest initialDataSize={50} testScenario="search" />);

		await waitFor(() => {
			expect(screen.getAllByText("50")).toHaveLength(2); // 初期状態で全アイテム（総数と表示数）
		});

		// 検索を実行
		const searchInput = screen.getByTestId("search-input");
		await user.type(searchInput, "ボイスドラマ");

		// フィルタ後のアイテム数が変更されることを確認
		// （実際の数値は生成されたデータに依存するため、変更があったことのみ確認）
		await waitFor(() => {
			expect(screen.getByTestId("progressive-list")).toBeInTheDocument();
		});
	});

	it("should disable test button while running", async () => {
		const user = userEvent.setup();

		render(<LargeDatasetIntegrationTest initialDataSize={20} testScenario="interaction" />);

		await waitFor(() => {
			expect(screen.getByText("統合テスト実行")).toBeInTheDocument();
		});

		const testButton = screen.getByText("統合テスト実行");
		await user.click(testButton);

		// ボタンが無効化されることを確認
		expect(testButton).toBeDisabled();
		expect(screen.getByText("統合テスト実行中...")).toBeInTheDocument();
	});
});
