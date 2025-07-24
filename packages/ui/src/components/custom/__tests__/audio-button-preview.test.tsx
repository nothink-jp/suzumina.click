/**
 * @vitest-environment happy-dom
 */

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
	AudioButtonPreview,
	shouldShowPreview,
	useProgressiveLoading,
} from "../audio-button-preview";

// HighlightTextのモック
vi.mock("../highlight-text", () => ({
	HighlightText: vi.fn(({ text, searchQuery }) => (
		<span>{searchQuery ? `${text} (highlighted: ${searchQuery})` : text}</span>
	)),
}));

const createMockAudioButton = (id: string, title: string): FrontendAudioButtonData => ({
	id,
	title,
	description: `説明: ${title}`,
	tags: ["テスト", "サンプル", "追加タグ"],
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

describe("AudioButtonPreview", () => {
	const mockAudioButton = createMockAudioButton("1", "テスト音声ボタン");

	it("should render preview with basic information", () => {
		render(<AudioButtonPreview audioButton={mockAudioButton} />);

		expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
		expect(screen.getByText("説明: テスト音声ボタン")).toBeInTheDocument();
		expect(screen.getByText("再生")).toBeInTheDocument();
		expect(screen.getByText("テスト")).toBeInTheDocument();
		expect(screen.getByText("サンプル")).toBeInTheDocument();
		expect(screen.getByText("+1")).toBeInTheDocument(); // 追加タグ数
	});

	it("should handle search query highlighting", () => {
		const searchQuery = "テスト";
		render(<AudioButtonPreview audioButton={mockAudioButton} searchQuery={searchQuery} />);

		expect(screen.getByText("テスト音声ボタン (highlighted: テスト)")).toBeInTheDocument();
		expect(screen.getByText("テスト (highlighted: テスト)")).toBeInTheDocument();
	});

	it("should handle favorite toggle", async () => {
		const user = userEvent.setup();
		const onFavoriteToggle = vi.fn();

		render(
			<AudioButtonPreview audioButton={mockAudioButton} onFavoriteToggle={onFavoriteToggle} />,
		);

		const favoriteButton = screen.getByLabelText("お気に入りに追加");
		await user.click(favoriteButton);

		expect(onFavoriteToggle).toHaveBeenCalledTimes(1);
	});

	it("should handle initial favorite state", () => {
		render(<AudioButtonPreview audioButton={mockAudioButton} initialIsFavorited={true} />);

		const favoriteButton = screen.getByLabelText("お気に入りから削除");
		expect(favoriteButton).toHaveClass("text-red-500");
	});

	it("should call onUpgrade when play button is clicked", async () => {
		const user = userEvent.setup();
		const onUpgrade = vi.fn();

		render(<AudioButtonPreview audioButton={mockAudioButton} onUpgrade={onUpgrade} />);

		const playButton = screen.getByText("再生");
		await user.click(playButton);

		expect(onUpgrade).toHaveBeenCalledTimes(1);
	});

	it("should call onUpgrade when container is clicked", async () => {
		const user = userEvent.setup();
		const onUpgrade = vi.fn();

		render(<AudioButtonPreview audioButton={mockAudioButton} onUpgrade={onUpgrade} />);

		const container = screen.getByTestId("audio-button-preview-1");
		await user.click(container);

		expect(onUpgrade).toHaveBeenCalledTimes(1);
	});

	it("should handle keyboard navigation", async () => {
		const user = userEvent.setup();
		const onUpgrade = vi.fn();

		render(<AudioButtonPreview audioButton={mockAudioButton} onUpgrade={onUpgrade} />);

		const container = screen.getByTestId("audio-button-preview-1");
		container.focus();
		await user.keyboard("{Enter}");

		expect(onUpgrade).toHaveBeenCalledTimes(1);
	});

	it("should apply custom className", () => {
		const customClass = "custom-preview-class";
		render(<AudioButtonPreview audioButton={mockAudioButton} className={customClass} />);

		const container = screen.getByTestId("audio-button-preview-1");
		expect(container).toHaveClass(customClass);
	});

	it("should show detail link when enabled", () => {
		render(<AudioButtonPreview audioButton={mockAudioButton} showDetailLink={true} />);

		expect(screen.getByText("詳細")).toBeInTheDocument();
	});

	it("should hide detail link when disabled", () => {
		render(<AudioButtonPreview audioButton={mockAudioButton} showDetailLink={false} />);

		expect(screen.queryByText("詳細")).not.toBeInTheDocument();
	});

	it("should display metadata correctly", () => {
		render(<AudioButtonPreview audioButton={mockAudioButton} />);

		expect(screen.getByText("10秒")).toBeInTheDocument();
		expect(screen.getByText("テストユーザー")).toBeInTheDocument();
		expect(screen.getByText("1日前")).toBeInTheDocument();
	});

	it("should display upgrade prompt", () => {
		render(<AudioButtonPreview audioButton={mockAudioButton} />);

		expect(screen.getByText("クリックして完全版を読み込み")).toBeInTheDocument();
	});
});

describe("shouldShowPreview", () => {
	it("should return true for items within visible range", () => {
		const visibleRange = { start: 10, end: 20 };

		expect(shouldShowPreview(15, visibleRange)).toBe(true);
		expect(shouldShowPreview(10, visibleRange)).toBe(true);
		expect(shouldShowPreview(20, visibleRange)).toBe(true);
	});

	it("should return true for items within buffer", () => {
		const visibleRange = { start: 10, end: 20 };
		const bufferSize = 3;

		expect(shouldShowPreview(7, visibleRange, bufferSize)).toBe(true); // 10 - 3
		expect(shouldShowPreview(23, visibleRange, bufferSize)).toBe(true); // 20 + 3
	});

	it("should return false for items outside buffer", () => {
		const visibleRange = { start: 10, end: 20 };
		const bufferSize = 3;

		expect(shouldShowPreview(6, visibleRange, bufferSize)).toBe(false);
		expect(shouldShowPreview(24, visibleRange, bufferSize)).toBe(false);
	});

	it("should use default buffer size", () => {
		const visibleRange = { start: 10, end: 20 };

		expect(shouldShowPreview(5, visibleRange)).toBe(true); // 10 - 5
		expect(shouldShowPreview(25, visibleRange)).toBe(true); // 20 + 5
		expect(shouldShowPreview(4, visibleRange)).toBe(false);
		expect(shouldShowPreview(26, visibleRange)).toBe(false);
	});
});

describe("useProgressiveLoading", () => {
	it("should initialize with empty upgraded items", () => {
		const { result } = renderHook(() => useProgressiveLoading());

		expect(result.current.upgradedCount).toBe(0);
		expect(result.current.isUpgraded("test-id")).toBe(false);
	});

	it("should upgrade items correctly", () => {
		const { result } = renderHook(() => useProgressiveLoading());

		// アイテムをアップグレード
		act(() => {
			result.current.upgradeItem("test-id-1");
			result.current.upgradeItem("test-id-2");
		});

		expect(result.current.upgradedCount).toBe(2);
		expect(result.current.isUpgraded("test-id-1")).toBe(true);
		expect(result.current.isUpgraded("test-id-2")).toBe(true);
		expect(result.current.isUpgraded("test-id-3")).toBe(false);
	});

	it("should handle duplicate upgrades", () => {
		const { result } = renderHook(() => useProgressiveLoading());

		// 同じアイテムを複数回アップグレード
		act(() => {
			result.current.upgradeItem("test-id");
			result.current.upgradeItem("test-id");
		});

		expect(result.current.upgradedCount).toBe(1);
		expect(result.current.isUpgraded("test-id")).toBe(true);
	});

	it("should reset upgraded items", () => {
		const { result } = renderHook(() => useProgressiveLoading());

		// アイテムをアップグレード
		act(() => {
			result.current.upgradeItem("test-id-1");
			result.current.upgradeItem("test-id-2");
		});
		expect(result.current.upgradedCount).toBe(2);

		// リセット
		act(() => {
			result.current.reset();
		});
		expect(result.current.upgradedCount).toBe(0);
		expect(result.current.isUpgraded("test-id-1")).toBe(false);
		expect(result.current.isUpgraded("test-id-2")).toBe(false);
	});
});
