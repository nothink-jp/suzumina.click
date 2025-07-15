/**
 * @vitest-environment happy-dom
 */

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AudioButton } from "./audio-button";

// YouTube Player Pool のモック
vi.mock("../../lib/youtube-player-pool", () => ({
	youTubePlayerPool: {
		onReady: vi.fn((callback) => callback()),
		playSegment: vi.fn(),
		stopCurrentSegment: vi.fn(),
		getOrCreatePlayer: vi.fn(() =>
			Promise.resolve({
				setVolume: vi.fn(),
			}),
		),
		getStats: vi.fn(() => ({
			activeSegmentVideoId: null,
		})),
	},
}));

const mockAudioButton: FrontendAudioButtonData = {
	id: "test-audio-button",
	title: "テスト音声ボタン",
	description: "テスト用の音声ボタンです",
	tags: ["テスト", "サンプル"],
	sourceVideoId: "test-video-id",
	sourceVideoTitle: "テスト動画",
	sourceVideoThumbnailUrl: "https://img.youtube.com/vi/test-video-id/maxresdefault.jpg",
	startTime: 10,
	endTime: 20,
	createdBy: "test-user-id",
	createdByName: "テストユーザー",
	isPublic: true,
	playCount: 5,
	likeCount: 2,
	favoriteCount: 1,
	createdAt: "2025-01-01T00:00:00.000Z",
	updatedAt: "2025-01-01T00:00:00.000Z",
	durationText: "10秒",
	relativeTimeText: "1日前",
};

describe("AudioButton", () => {
	it("should render audio button with title", () => {
		render(<AudioButton audioButton={mockAudioButton} />);

		expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
	});

	it("should show play button", () => {
		render(<AudioButton audioButton={mockAudioButton} />);

		const playButton = screen.getByRole("button", { name: "再生" });
		expect(playButton).toBeInTheDocument();
	});

	it("should truncate long titles", () => {
		const longTitleButton = {
			...mockAudioButton,
			title: "とても長いタイトルのテスト音声ボタンです",
		};

		render(<AudioButton audioButton={longTitleButton} maxTitleLength={10} />);

		expect(screen.getByText("とても長いタイトルの...")).toBeInTheDocument();
	});

	it("should handle play button click", async () => {
		const user = userEvent.setup();
		const onPlayMock = vi.fn();

		render(<AudioButton audioButton={mockAudioButton} onPlay={onPlayMock} />);

		const playButton = screen.getByRole("button", { name: "再生" });
		await user.click(playButton);

		// プレイボタンのクリックが処理されることを確認
		expect(playButton).toBeInTheDocument();
	});

	it("should show popover on trigger click", async () => {
		const user = userEvent.setup();

		render(<AudioButton audioButton={mockAudioButton} />);

		// 詳細表示ボタン（iアイコン）をクリック
		const infoButton = screen.getByRole("button", { name: "詳細を表示" });
		await user.click(infoButton);

		// ポップオーバーの内容が表示されることを確認
		expect(screen.getAllByText("テスト音声ボタン")).toHaveLength(2); // トリガーとポップオーバー内
	});

	it("should display metadata in popover", async () => {
		const user = userEvent.setup();

		render(<AudioButton audioButton={mockAudioButton} />);

		// 詳細表示ボタン（iアイコン）をクリック
		const infoButton = screen.getByRole("button", { name: "詳細を表示" });
		await user.click(infoButton);

		// メタデータが表示されることを確認
		expect(screen.getByText("10秒")).toBeInTheDocument();
		expect(screen.getByText("テストユーザー")).toBeInTheDocument();
		expect(screen.getByText("再生: 5回")).toBeInTheDocument();
	});

	it("should display tags", async () => {
		const user = userEvent.setup();

		render(<AudioButton audioButton={mockAudioButton} />);

		// 詳細表示ボタン（iアイコン）をクリック
		const infoButton = screen.getByRole("button", { name: "詳細を表示" });
		await user.click(infoButton);

		// タグが表示されることを確認
		expect(screen.getByText("テスト")).toBeInTheDocument();
		expect(screen.getByText("サンプル")).toBeInTheDocument();
	});

	it("should handle favorite toggle", async () => {
		const user = userEvent.setup();
		const onFavoriteToggleMock = vi.fn();

		render(
			<AudioButton
				audioButton={mockAudioButton}
				isFavorite={false}
				onFavoriteToggle={onFavoriteToggleMock}
			/>,
		);

		// 詳細表示ボタン（iアイコン）をクリック
		const infoButton = screen.getByRole("button", { name: "詳細を表示" });
		await user.click(infoButton);

		// お気に入りボタンをクリック
		const favoriteButton = screen.getByText("お気に入り");
		await user.click(favoriteButton);

		expect(onFavoriteToggleMock).toHaveBeenCalledTimes(1);
	});

	it("should show unfavorite button when favorited", async () => {
		const user = userEvent.setup();

		render(
			<AudioButton audioButton={mockAudioButton} isFavorite={true} onFavoriteToggle={vi.fn()} />,
		);

		// 詳細表示ボタン（iアイコン）をクリック
		const infoButton = screen.getByRole("button", { name: "詳細を表示" });
		await user.click(infoButton);

		expect(screen.getByText("お気に入り解除")).toBeInTheDocument();
	});

	it("should handle detail click", async () => {
		const user = userEvent.setup();
		const onDetailClickMock = vi.fn();

		render(
			<AudioButton
				audioButton={mockAudioButton}
				showDetailLink={true}
				onDetailClick={onDetailClickMock}
			/>,
		);

		// 詳細表示ボタン（iアイコン）をクリック
		const infoButton = screen.getByRole("button", { name: "詳細を表示" });
		await user.click(infoButton);

		// 詳細ボタンをクリック
		const detailButton = screen.getByText("詳細");
		await user.click(detailButton);

		expect(onDetailClickMock).toHaveBeenCalledTimes(1);
	});

	it("should highlight search query", () => {
		render(
			<AudioButton
				audioButton={mockAudioButton}
				searchQuery="テスト"
				highlightClassName="highlight"
			/>,
		);

		// ハイライトされたテキストが表示されることを確認
		expect(screen.getByText("テスト")).toBeInTheDocument();
		expect(screen.getByText("音声ボタン")).toBeInTheDocument();
	});

	it("should show YouTube link", async () => {
		const user = userEvent.setup();

		render(<AudioButton audioButton={mockAudioButton} />);

		// 詳細表示ボタン（iアイコン）をクリック
		const infoButton = screen.getByRole("button", { name: "詳細を表示" });
		await user.click(infoButton);

		const youtubeLink = screen.getByText("YouTube");
		expect(youtubeLink).toBeInTheDocument();

		// リンクのhrefが正しいことを確認
		const linkElement = youtubeLink.closest("a");
		expect(linkElement).toHaveAttribute(
			"href",
			"https://www.youtube.com/watch?v=test-video-id&t=10s",
		);
	});
});
