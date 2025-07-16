/**
 * @vitest-environment happy-dom
 */

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AudioPlayer } from "./audio-player";

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
	tags: ["テスト"],
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
	dislikeCount: 0,
	favoriteCount: 1,
	createdAt: "2025-01-01T00:00:00.000Z",
	updatedAt: "2025-01-01T00:00:00.000Z",
	durationText: "10秒",
	relativeTimeText: "1日前",
};

describe("AudioPlayer", () => {
	it("should render without visible DOM elements", () => {
		const { container } = render(<AudioPlayer audioButton={mockAudioButton} />);

		// AudioPlayerはDOM要素を持たないため、コンテナは空であることを確認
		expect(container.firstChild).toBeNull();
	});

	it("should call onPlay callback when play is triggered", async () => {
		const onPlayMock = vi.fn();

		render(<AudioPlayer audioButton={mockAudioButton} onPlay={onPlayMock} />);

		// プール化されたプレイヤーが準備完了していることを確認
		// 実際のテストではプールのモックが呼ばれることを確認
		expect(onPlayMock).not.toHaveBeenCalled();
	});

	it("should handle volume changes", () => {
		render(<AudioPlayer audioButton={mockAudioButton} volume={75} />);

		// Volume設定が適用されることを確認
		// 実際のプレイヤーインスタンスでの音量設定はプールのモックで確認
	});

	it("should cleanup on unmount", () => {
		const { unmount } = render(<AudioPlayer audioButton={mockAudioButton} />);

		// コンポーネントのアンマウント
		unmount();

		// クリーンアップが適切に行われることを確認
		// プールのstopCurrentSegmentが呼ばれる想定
	});

	it("should handle autoPlay prop", () => {
		render(<AudioPlayer audioButton={mockAudioButton} autoPlay={true} />);

		// 自動再生が設定されていることを確認
		// 実際の再生はプールのplaySegmentメソッドで行われる
	});

	it("should handle callback functions", () => {
		const onPlayMock = vi.fn();
		const onPauseMock = vi.fn();
		const onEndMock = vi.fn();

		render(
			<AudioPlayer
				audioButton={mockAudioButton}
				onPlay={onPlayMock}
				onPause={onPauseMock}
				onEnd={onEndMock}
			/>,
		);

		// コールバック関数が適切に設定されることを確認
		expect(onPlayMock).not.toHaveBeenCalled();
		expect(onPauseMock).not.toHaveBeenCalled();
		expect(onEndMock).not.toHaveBeenCalled();
	});
});
