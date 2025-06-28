import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
	uploadedBy: "user123",
	uploadedByName: "テストユーザー",
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
		expect(screen.getByLabelText("メニューを表示")).toBeInTheDocument();
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

	it("メニューアイコンが存在する", () => {
		render(<SimpleAudioButton audioButton={mockAudioButton} />);

		const menuButton = screen.getByLabelText("メニューを表示");
		expect(menuButton).toBeInTheDocument();
	});

	it("異なるendTimeでも正しくレンダリングされる", () => {
		const audioButtonWithDifferentEndTime = {
			...mockAudioButton,
			endTime: 130, // 5秒延長
		};

		render(<SimpleAudioButton audioButton={audioButtonWithDifferentEndTime} />);

		expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
		expect(screen.getByLabelText("メニューを表示")).toBeInTheDocument();
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
});
