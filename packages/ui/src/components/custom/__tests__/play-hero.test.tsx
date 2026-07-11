/**
 * @vitest-environment happy-dom
 */

import type { AudioButton as AudioButtonType } from "@suzumina.click/shared-types";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PROGRESS_TICK_MS } from "../../../lib/playback-constants";
import { PlayHero } from "../play-hero";

// AudioPlayer は props を捕捉するスタブに差し替え、onPlay/onPause/onEnd を任意に発火できるようにする
// （YouTube pool 実体はテスト環境で再生状態まで到達しないため、コールバック契約を直接検証する）
let capturedPlayerProps: Record<string, unknown> | null = null;
vi.mock("../audio-player", () => ({
	AudioPlayer: (props: Record<string, unknown>) => {
		capturedPlayerProps = props;
		return null;
	},
}));

const firePlayerEvent = (name: "onPlay" | "onPause" | "onEnd" | "onProgress", arg?: number) => {
	act(() => {
		(capturedPlayerProps?.[name] as (n?: number) => void)?.(arg);
	});
};

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

	it("再生開始で onPlay と onPlayStateChange(true) が呼ばれ、一時停止表示になる", () => {
		const onPlay = vi.fn();
		const onPlayStateChange = vi.fn();
		render(
			<PlayHero
				audioButton={mockAudioButton}
				onPlay={onPlay}
				onPlayStateChange={onPlayStateChange}
			/>,
		);

		firePlayerEvent("onPlay");

		expect(onPlay).toHaveBeenCalledTimes(1);
		expect(onPlayStateChange).toHaveBeenLastCalledWith(true);
		expect(screen.getByRole("button", { name: "一時停止" })).toBeInTheDocument();
	});

	it("一時停止で onPlayStateChange(false) が呼ばれ、進捗がリセットされる", () => {
		const onPlayStateChange = vi.fn();
		const { container } = render(
			<PlayHero audioButton={mockAudioButton} onPlayStateChange={onPlayStateChange} />,
		);

		firePlayerEvent("onPlay");
		firePlayerEvent("onProgress", 40);
		firePlayerEvent("onPause");

		expect(onPlayStateChange).toHaveBeenLastCalledWith(false);
		expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();
		const fill = container.querySelector('span[style*="width: 0%"]');
		expect(fill).not.toBeNull();
	});

	it("再生終了でも onPlayStateChange(false) が呼ばれる", () => {
		const onPlayStateChange = vi.fn();
		render(<PlayHero audioButton={mockAudioButton} onPlayStateChange={onPlayStateChange} />);

		firePlayerEvent("onPlay");
		firePlayerEvent("onEnd");

		expect(onPlayStateChange).toHaveBeenLastCalledWith(false);
	});

	it("L サイズは進捗フィルを width 0% で初期化する（既定）", () => {
		const { container } = render(<PlayHero audioButton={mockAudioButton} size="L" />);

		const fill = container.querySelector('span[style*="width: 0%"]');
		expect(fill).not.toBeNull();
	});

	it("進捗フィルの transition は進捗更新間隔と同値（カクつき防止・SPR-259）", () => {
		const { container } = render(<PlayHero audioButton={mockAudioButton} />);

		const fill = container.querySelector('span[style*="width: 0%"]') as HTMLElement;
		expect(fill.style.transitionDuration).toBe(`${PROGRESS_TICK_MS}ms`);
	});

	it("M サイズでも同一の accessibility 構造を保つ", () => {
		render(<PlayHero audioButton={mockAudioButton} size="M" />);

		expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();
		expect(screen.getByText("よわよわ〜")).toBeInTheDocument();
	});
});
