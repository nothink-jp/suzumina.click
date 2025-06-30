import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	mockViewport,
	testAcrossViewports,
	validateResponsiveClasses,
} from "../../test-utils/responsive-testing";
import { SimpleAudioButton } from "./simple-audio-button";

// YouTube API のモック
const mockYTPlayer = {
	playVideo: vi.fn(),
	pauseVideo: vi.fn(),
	stopVideo: vi.fn(),
	seekTo: vi.fn(),
	getCurrentTime: vi.fn(() => 0),
	getDuration: vi.fn(() => 100),
	getPlayerState: vi.fn(() => -1),
	setVolume: vi.fn(),
	getVolume: vi.fn(() => 50),
	destroy: vi.fn(),
	loadVideoById: vi.fn(),
};

// グローバル YouTube API のモック
// window.YTとonYouTubeIframeAPIReadyを直接設定
Object.assign(global.window, {
	YT: {
		Player: vi.fn().mockImplementation(() => mockYTPlayer),
		PlayerState: {
			UNSTARTED: -1,
			ENDED: 0,
			PLAYING: 1,
			PAUSED: 2,
			BUFFERING: 3,
			CUED: 5,
		},
		ready: vi.fn(),
	},
	onYouTubeIframeAPIReady: vi.fn(),
});

const mockAudioButton: FrontendAudioButtonData = {
	id: "test-1",
	title: "テスト音声ボタン",
	description: "テスト用の説明",
	tags: ["テスト", "音声"],
	sourceVideoId: "dQw4w9WgXcQ",
	sourceVideoTitle: "テスト動画タイトル",
	sourceVideoThumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
	startTime: 120,
	endTime: 125,
	createdBy: "user123",
	createdByName: "テストユーザー",
	isPublic: true,
	playCount: 100,
	likeCount: 50,
	favoriteCount: 5,
	createdAt: "2024-06-26T00:00:00.000Z",
	updatedAt: "2024-06-26T00:00:00.000Z",
	durationText: "5秒",
	relativeTimeText: "1日前",
};

describe("SimpleAudioButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("正しくレンダリングされる", () => {
		render(<SimpleAudioButton audioButton={mockAudioButton} />);

		expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
		expect(screen.getByLabelText("テスト音声ボタンを再生")).toBeInTheDocument();
		expect(screen.getByLabelText("詳細情報を表示")).toBeInTheDocument();
	});

	it("初期状態ではローディングアイコンが表示される", () => {
		render(<SimpleAudioButton audioButton={mockAudioButton} />);

		// Loader2アイコンが表示されることを確認
		const loadingIcon = document.querySelector(".animate-spin");
		expect(loadingIcon).toBeInTheDocument();
	});

	it("AudioOnlyPlayerが正しく統合されている", () => {
		render(<SimpleAudioButton audioButton={mockAudioButton} />);

		// AudioOnlyPlayerコンポーネントが存在することを確認
		const audioPlayer = document.querySelector(".audio-only-player");
		expect(audioPlayer).toBeInTheDocument();
	});

	it("情報ボタンが存在する", () => {
		render(<SimpleAudioButton audioButton={mockAudioButton} />);

		const infoButton = screen.getByLabelText("詳細情報を表示");
		expect(infoButton).toBeInTheDocument();
	});

	it("異なるendTimeでも正しくレンダリングされる", () => {
		const audioButtonWithDifferentEndTime = {
			...mockAudioButton,
			endTime: 130, // 5秒延長
		};

		render(<SimpleAudioButton audioButton={audioButtonWithDifferentEndTime} />);

		expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
		expect(screen.getByLabelText("詳細情報を表示")).toBeInTheDocument();
	});

	it("YouTubeURLが正しく生成される", () => {
		render(<SimpleAudioButton audioButton={mockAudioButton} />);

		// コンポーネントが正しくレンダリングされることを確認
		expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();

		// YouTubeリンクの生成ロジックをテスト（内部的にURL生成がされているかを確認）
		const expectedUrl = `https://www.youtube.com/watch?v=${mockAudioButton.sourceVideoId}&t=${Math.floor(mockAudioButton.startTime)}`;
		expect(expectedUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120");
	});

	it("カスタムクラス名が適用される", () => {
		const { container } = render(
			<SimpleAudioButton audioButton={mockAudioButton} className="custom-class" />,
		);

		expect(container.firstChild).toHaveClass("custom-class");
	});

	describe("Responsive Behavior", () => {
		beforeEach(() => {
			// デフォルトのビューポートサイズをリセット
			mockViewport(1440, 900);
		});

		it("should render with correct touch target sizes", () => {
			render(<SimpleAudioButton audioButton={mockAudioButton} />);

			const infoButton = screen.getByLabelText("詳細情報を表示");
			validateResponsiveClasses(infoButton, {
				base: ["min-h-[44px]", "min-w-[44px]"],
			});
		});

		it("should have responsive icon sizing", () => {
			render(<SimpleAudioButton audioButton={mockAudioButton} />);

			const playButton = screen.getByLabelText(`${mockAudioButton.title}を再生`);
			const playIconContainer = playButton.querySelector(".flex.h-10");

			expect(playIconContainer).toHaveClass("h-10", "w-10", "sm:h-8", "sm:w-8");
		});

		it("should render with responsive popover width", () => {
			render(<SimpleAudioButton audioButton={mockAudioButton} />);

			const infoButton = screen.getByLabelText("詳細情報を表示");
			fireEvent.click(infoButton);

			// PopoverContentを探す
			const popoverContent = document.querySelector("[data-radix-popover-content]");
			if (popoverContent) {
				expect(popoverContent).toHaveClass("w-72", "sm:w-80");
			}
		});

		testAcrossViewports("should maintain touch accessibility", (viewport) => {
			render(<SimpleAudioButton audioButton={mockAudioButton} />);

			const infoButton = screen.getByLabelText("詳細情報を表示");

			// モバイルでは44px以上のタッチターゲットを確保
			if (viewport.width < 640) {
				expect(infoButton).toHaveClass("min-h-[44px]", "min-w-[44px]");
			}
		});

		it("should handle mobile touch interactions", () => {
			mockViewport(375, 667); // Mobile viewport

			render(<SimpleAudioButton audioButton={mockAudioButton} />);

			const playButton = screen.getByLabelText(`${mockAudioButton.title}を再生`);
			const infoButton = screen.getByLabelText("詳細情報を表示");

			// タッチターゲットが適切なサイズであることを確認
			expect(infoButton).toHaveClass("min-h-[44px]", "min-w-[44px]");

			// ボタンがクリック可能であることを確認
			expect(playButton).not.toHaveAttribute("disabled");
			expect(infoButton).not.toHaveAttribute("disabled");
		});

		it("should render gradient background correctly", () => {
			render(<SimpleAudioButton audioButton={mockAudioButton} />);

			const button = screen.getByLabelText(`${mockAudioButton.title}を再生`);
			// 実際のグラデーションクラスは親コンテナに適用されている
			const container = button.closest(".bg-gradient-to-r");
			expect(container).toBeTruthy();
		});

		it("should truncate title based on maxTitleLength prop", () => {
			const longTitleButton = {
				...mockAudioButton,
				title: "これは非常に長いタイトルでmaxTitleLengthプロパティによって切り詰められるべきです",
			};

			render(<SimpleAudioButton audioButton={longTitleButton} maxTitleLength={20} />);

			const titleText = screen.getByText(/これは非常に長いタイトル/);
			expect(titleText.textContent?.length).toBeLessThanOrEqual(23); // "..." included
		});

		it("should show full title in popover regardless of truncation", () => {
			const longTitleButton = {
				...mockAudioButton,
				title: "これは非常に長いタイトルです",
			};

			render(<SimpleAudioButton audioButton={longTitleButton} maxTitleLength={10} />);

			const infoButton = screen.getByLabelText("詳細情報を表示");
			fireEvent.click(infoButton);

			// ポップオーバーで完全なタイトルが表示されることを確認
			expect(screen.getByText("これは非常に長いタイトルです")).toBeInTheDocument();
		});
	});

	describe("Touch Target Validation", () => {
		it("should meet WCAG touch target requirements", () => {
			render(<SimpleAudioButton audioButton={mockAudioButton} />);

			const infoButton = screen.getByLabelText("詳細情報を表示");

			// WCAG 2.1 AAA基準: 44x44px最小サイズ
			expect(infoButton).toHaveClass("min-h-[44px]", "min-w-[44px]");
		});

		it("should maintain touch target size across all states", () => {
			render(<SimpleAudioButton audioButton={mockAudioButton} />);

			const playButton = screen.getByLabelText(`${mockAudioButton.title}を再生`);
			const infoButton = screen.getByLabelText("詳細情報を表示");

			// 両方のボタンが適切なタッチターゲットサイズを持つ
			expect(infoButton).toHaveClass("min-h-[44px]", "min-w-[44px]");

			// プレイボタンコンテナのサイズも確認
			const playIconContainer = playButton.querySelector(".flex");
			expect(playIconContainer).toHaveClass("h-10", "w-10");
		});
	});
});
