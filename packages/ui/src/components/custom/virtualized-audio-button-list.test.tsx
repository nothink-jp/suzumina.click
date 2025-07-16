/**
 * @vitest-environment happy-dom
 */

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	calculateResponsiveItemSize,
	calculateVirtualListLayout,
	useVirtualizationMetrics,
	VirtualizedAudioButtonList,
} from "./virtualized-audio-button-list";

// react-windowのモック
vi.mock("react-window", () => ({
	FixedSizeList: ({ children: Children, itemData, itemCount, height }: any) => {
		// 簡易的なモック実装（最初の5個のアイテムのみレンダリング）
		const itemsToRender = Math.min(itemCount, 5);
		return (
			<div data-testid="virtualized-list" style={{ height: `${height}px` }}>
				{Array.from({ length: itemsToRender }, (_, index) => (
					<Children key={index} index={index} style={{ height: 140 }} data={itemData} />
				))}
			</div>
		);
	},
}));

// AudioButtonのモック
vi.mock("./audio-button", () => ({
	AudioButton: vi.fn(({ audioButton, searchQuery, onPlay }) => (
		<div data-testid={`audio-button-${audioButton.id}`}>
			<button type="button" onClick={() => onPlay?.()}>
				{searchQuery ? `${audioButton.title} (highlighted: ${searchQuery})` : audioButton.title}
			</button>
		</div>
	)),
}));

const createMockAudioButton = (id: string, title: string): FrontendAudioButtonData => ({
	id,
	title,
	description: `説明: ${title}`,
	tags: ["テスト"],
	sourceVideoId: `video-${id}`,
	sourceVideoTitle: `動画: ${title}`,
	sourceVideoThumbnailUrl: `https://img.youtube.com/vi/video-${id}/maxresdefault.jpg`,
	startTime: 10,
	endTime: 20,
	createdBy: "test-user",
	createdByName: "テストユーザー",
	isPublic: true,
	playCount: 1,
	likeCount: 0,
	dislikeCount: 0,
	favoriteCount: 0,
	createdAt: "2025-01-01T00:00:00.000Z",
	updatedAt: "2025-01-01T00:00:00.000Z",
	durationText: "10秒",
	relativeTimeText: "1日前",
});

describe("VirtualizedAudioButtonList", () => {
	const mockAudioButtons: FrontendAudioButtonData[] = [
		createMockAudioButton("1", "テスト音声1"),
		createMockAudioButton("2", "テスト音声2"),
		createMockAudioButton("3", "テスト音声3"),
		createMockAudioButton("4", "テスト音声4"),
		createMockAudioButton("5", "テスト音声5"),
		createMockAudioButton("6", "テスト音声6"),
	];

	it("should render virtualized list with audio buttons", () => {
		render(<VirtualizedAudioButtonList audioButtons={mockAudioButtons} height={400} />);

		const virtualizedList = screen.getByTestId("virtualized-list");
		expect(virtualizedList).toBeInTheDocument();
		// Heightは文字列として渡されるので数値のみをチェック
		expect(virtualizedList.style.height).toContain("400");

		// 仮想化により最初の5個のみがレンダリングされる
		expect(screen.getByTestId("audio-button-1")).toBeInTheDocument();
		expect(screen.getByTestId("audio-button-5")).toBeInTheDocument();
		expect(screen.queryByTestId("audio-button-6")).not.toBeInTheDocument();
	});

	it("should display empty message when no audio buttons", () => {
		render(<VirtualizedAudioButtonList audioButtons={[]} />);

		expect(screen.getByText("音声ボタンが見つかりませんでした")).toBeInTheDocument();
		expect(screen.queryByTestId("virtualized-list")).not.toBeInTheDocument();
	});

	it("should display custom empty message", () => {
		const customMessage = "カスタム空メッセージ";
		render(<VirtualizedAudioButtonList audioButtons={[]} emptyMessage={customMessage} />);

		expect(screen.getByText(customMessage)).toBeInTheDocument();
	});

	it("should pass search query to audio buttons", () => {
		const searchQuery = "テスト";
		render(
			<VirtualizedAudioButtonList
				audioButtons={mockAudioButtons.slice(0, 2)}
				searchQuery={searchQuery}
			/>,
		);

		expect(screen.getByText("テスト音声1 (highlighted: テスト)")).toBeInTheDocument();
		expect(screen.getByText("テスト音声2 (highlighted: テスト)")).toBeInTheDocument();
	});

	it("should handle favorite states correctly", () => {
		const favoriteStates = new Map([
			["1", true],
			["2", false],
		]);

		render(
			<VirtualizedAudioButtonList
				audioButtons={mockAudioButtons.slice(0, 2)}
				favoriteStates={favoriteStates}
			/>,
		);

		// AudioButtonコンポーネントがfavoriteStatesを受け取ることを確認
		expect(screen.getByTestId("audio-button-1")).toBeInTheDocument();
		expect(screen.getByTestId("audio-button-2")).toBeInTheDocument();
	});

	it("should highlight currently playing item", () => {
		render(
			<VirtualizedAudioButtonList
				audioButtons={mockAudioButtons.slice(0, 3)}
				currentPlayingId="2"
			/>,
		);

		const playingItem = screen.getByTestId("audio-button-2").parentElement;
		expect(playingItem).toHaveClass("bg-minase-50");
	});

	it("should call onPlay handler with correct parameters", () => {
		const onPlay = vi.fn();
		render(
			<VirtualizedAudioButtonList audioButtons={mockAudioButtons.slice(0, 2)} onPlay={onPlay} />,
		);

		const button1 = screen.getByText("テスト音声1");
		button1.click();

		expect(onPlay).toHaveBeenCalledWith(mockAudioButtons[0], 0);
	});

	it("should apply custom className", () => {
		const { container } = render(
			<VirtualizedAudioButtonList audioButtons={mockAudioButtons} className="custom-class" />,
		);

		const listContainer = container.firstChild as HTMLElement;
		expect(listContainer).toHaveClass("custom-class");
	});
});

describe("calculateVirtualListLayout", () => {
	it("should calculate layout correctly", () => {
		const mockAudioButtons: FrontendAudioButtonData[] = [
			createMockAudioButton("1", "テスト音声1"),
			createMockAudioButton("2", "テスト音声2"),
			createMockAudioButton("3", "テスト音声3"),
			createMockAudioButton("4", "テスト音声4"),
			createMockAudioButton("5", "テスト音声5"),
			createMockAudioButton("6", "テスト音声6"),
		];
		const items = mockAudioButtons;
		const containerHeight = 800;
		const itemHeight = 140;

		const layout = calculateVirtualListLayout(items, containerHeight, itemHeight);

		expect(layout.totalHeight).toBe(6 * 140); // 6 items * 140px
		expect(layout.visibleCount).toBe(Math.ceil(800 / 140)); // ~6
		expect(layout.overscanCount).toBe(5);
		expect(layout.itemHeight).toBe(140);
		expect(layout.renderableItems).toBe(layout.visibleCount + 10); // visible + overscan * 2
		expect(layout.memoryEstimate).toMatch(/\d+\.\d+MB/);
	});

	it("should handle empty items list", () => {
		const layout = calculateVirtualListLayout([], 800, 140);

		expect(layout.totalHeight).toBe(0);
		expect(layout.visibleCount).toBe(Math.ceil(800 / 140));
		expect(layout.renderableItems).toBeGreaterThan(0); // オーバースキャンがあるため
	});
});

describe("calculateResponsiveItemSize", () => {
	it("should return smaller size for mobile", () => {
		const mobileSize = calculateResponsiveItemSize(500, 140);
		expect(mobileSize).toBe(120); // 140 - 20
	});

	it("should return medium size for tablet", () => {
		const tabletSize = calculateResponsiveItemSize(800, 140);
		expect(tabletSize).toBe(130); // 140 - 10
	});

	it("should return full size for desktop", () => {
		const desktopSize = calculateResponsiveItemSize(1200, 140);
		expect(desktopSize).toBe(140); // 140
	});

	it("should use default base size", () => {
		const defaultSize = calculateResponsiveItemSize(1200);
		expect(defaultSize).toBe(140);
	});
});

describe("useVirtualizationMetrics", () => {
	it("should calculate metrics correctly", () => {
		const { result } = renderHook(() => useVirtualizationMetrics(100, 10));

		expect(result.current.totalItems).toBe(100);
		expect(result.current.renderedItems).toBe(10);
		expect(result.current.renderEfficiency).toBe("10.0%");
		expect(result.current.memoryReduction).toBe("90.0%");
		expect(result.current.isEfficient).toBe(true);
	});

	it("should handle zero items", () => {
		const { result } = renderHook(() => useVirtualizationMetrics(0, 0));

		expect(result.current.totalItems).toBe(0);
		expect(result.current.renderedItems).toBe(0);
		expect(result.current.renderEfficiency).toBe("0.0%");
		expect(result.current.memoryReduction).toBe("0.0%");
	});

	it("should identify inefficient rendering", () => {
		const { result } = renderHook(() => useVirtualizationMetrics(100, 60));

		expect(result.current.renderEfficiency).toBe("60.0%");
		expect(result.current.isEfficient).toBe(false); // 50%を超える
	});
});

// Phase 2での追加テスト項目
describe("VirtualizedAudioButtonList - Phase 2 Performance", () => {
	it("should handle large datasets efficiently", () => {
		const largeMockData = Array.from({ length: 200 }, (_, index) =>
			createMockAudioButton(index.toString(), `大量データ${index}`),
		);

		render(<VirtualizedAudioButtonList audioButtons={largeMockData} height={800} />);

		// 仮想化により全てのアイテムがDOMに存在しないことを確認
		expect(screen.queryByTestId("audio-button-100")).not.toBeInTheDocument();
		expect(screen.queryByTestId("audio-button-199")).not.toBeInTheDocument();

		// 最初の数個のみがレンダリングされることを確認
		expect(screen.getByTestId("audio-button-0")).toBeInTheDocument();
		expect(screen.getByTestId("audio-button-4")).toBeInTheDocument();
	});

	it("should maintain performance with custom item size", () => {
		const mockAudioButtons: FrontendAudioButtonData[] = [
			createMockAudioButton("1", "テスト音声1"),
			createMockAudioButton("2", "テスト音声2"),
		];
		const customItemSize = 180;
		render(
			<VirtualizedAudioButtonList
				audioButtons={mockAudioButtons}
				height={800}
				itemSize={customItemSize}
			/>,
		);

		const virtualizedList = screen.getByTestId("virtualized-list");
		expect(virtualizedList).toBeInTheDocument();
	});
});
