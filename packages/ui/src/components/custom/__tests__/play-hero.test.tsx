/**
 * @vitest-environment happy-dom
 */

import type { AudioButton as AudioButtonType } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlayHero } from "../play-hero";

// YouTube Player Pool のモック（audio-button.test.tsx と同じ基盤）
vi.mock("../../lib/youtube-player-pool", () => ({
	youTubePlayerPool: {
		onReady: vi.fn((callback) => callback()),
		playSegment: vi.fn(),
		stopCurrentSegment: vi.fn(),
		getOrCreatePlayer: vi.fn(() => Promise.resolve({ setVolume: vi.fn() })),
		getStats: vi.fn(() => ({ activeSegmentVideoId: null })),
	},
}));

const mockAudioButton: AudioButtonType = {
	id: "hero-test",
	buttonText: "よわよわ〜",
	tags: [],
	videoId: "test-video",
	videoTitle: "テスト動画",
	startTime: 10,
	endTime: 13.4,
	duration: 3.4,
	creatorId: "u1",
	creatorName: "作成者",
	isPublic: true,
	stats: { playCount: 7, likeCount: 0, dislikeCount: 0, favoriteCount: 0, engagementRate: 0 },
	createdAt: "2026-06-26T00:00:00.000Z",
	updatedAt: "2026-06-26T00:00:00.000Z",
	_computed: {
		isPopular: false,
		engagementRate: 0,
		engagementRatePercentage: 0,
		popularityScore: 0,
		searchableText: "よわよわ〜",
		durationText: "3.4秒",
		relativeTimeText: "1日前",
	},
} as AudioButtonType;

describe("PlayHero", () => {
	it("ボタン名と再生ボタンを表示する", () => {
		render(<PlayHero audioButton={mockAudioButton} />);

		expect(screen.getByText("よわよわ〜")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();
	});

	it("クリックで読み込み中（disabled）になる", async () => {
		const user = userEvent.setup();
		render(<PlayHero audioButton={mockAudioButton} />);

		const button = screen.getByRole("button", { name: "再生" });
		await user.click(button);

		// 再生開始コールバックまでは読み込み中として無効化される
		expect(button).toBeDisabled();
	});

	it("L サイズは進捗フィルとテキストを持つ（既定）", () => {
		const { container } = render(<PlayHero audioButton={mockAudioButton} size="L" />);

		// 進捗フィルは width 0% で初期化される
		const fill = container.querySelector('span[style*="width: 0%"]');
		expect(fill).not.toBeNull();
	});

	it("M サイズでも同一の accessibility 構造を保つ", () => {
		render(<PlayHero audioButton={mockAudioButton} size="M" />);

		expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();
		expect(screen.getByText("よわよわ〜")).toBeInTheDocument();
	});
});
