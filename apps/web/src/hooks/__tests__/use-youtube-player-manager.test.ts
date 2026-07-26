import type { YTPlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useYouTubePlayerManager } from "../use-youtube-player-manager";

// テストダブルは hook が使うメソッドのみ実装。YTPlayer 全体へキャスト
const mockPlayer = {
	getCurrentTime: vi.fn(() => 0),
	getDuration: vi.fn(() => 300),
	getPlayerState: vi.fn(() => 5),
	seekTo: vi.fn(),
	playVideo: vi.fn(),
	pauseVideo: vi.fn(),
};

function setupReadyManager() {
	const rendered = renderHook(() => useYouTubePlayerManager({ initialVideoId: "test-video" }));
	act(() => {
		rendered.result.current.youtubePlayerRef.current = mockPlayer as unknown as YTPlayer;
		rendered.result.current.onPlayerReady();
	});
	return rendered;
}

describe("useYouTubePlayerManager クリップ再生（SPR-288）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		mockPlayer.getCurrentTime.mockReturnValue(0);
		mockPlayer.getDuration.mockReturnValue(300);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("startClip で先頭へシークして再生が始まる", () => {
		const { result } = setupReadyManager();

		act(() => {
			result.current.startClip(10, 12, { loop: true });
		});

		expect(mockPlayer.seekTo).toHaveBeenCalledWith(10, true);
		expect(mockPlayer.playVideo).toHaveBeenCalled();
		expect(result.current.clipPlayback).toEqual({ isActive: true, isLoop: true });
	});

	it("from が負でも 0 にクランプされる（プリロールで開始0秒付近）", () => {
		const { result } = setupReadyManager();

		act(() => {
			result.current.startClip(-1.5, 5, { loop: true });
		});

		expect(mockPlayer.seekTo).toHaveBeenCalledWith(0, true);
	});

	it("ループ: 終端到達で先頭へシークバックする", () => {
		const { result } = setupReadyManager();

		act(() => {
			result.current.startClip(10, 12, { loop: true });
		});
		mockPlayer.seekTo.mockClear();

		mockPlayer.getCurrentTime.mockReturnValue(12.05);
		act(() => {
			vi.advanceTimersByTime(70);
		});

		expect(mockPlayer.seekTo).toHaveBeenCalledWith(10, true);
		expect(result.current.clipPlayback.isActive).toBe(true);
	});

	it("ループ: シークバック直後の古い getCurrentTime では再シークしない", () => {
		const { result } = setupReadyManager();

		act(() => {
			result.current.startClip(10, 12, { loop: true });
		});
		mockPlayer.seekTo.mockClear();

		// シーク完了前は古い値（>= to）が返り続けることがある
		mockPlayer.getCurrentTime.mockReturnValue(12.05);
		act(() => {
			vi.advanceTimersByTime(200);
		});

		expect(mockPlayer.seekTo).toHaveBeenCalledTimes(1);
	});

	it("非ループ: 終端到達で一時停止して非アクティブになる", () => {
		const { result } = setupReadyManager();

		act(() => {
			result.current.startClip(10, 12, { loop: false });
		});

		mockPlayer.getCurrentTime.mockReturnValue(12.1);
		act(() => {
			vi.advanceTimersByTime(70);
		});

		expect(mockPlayer.pauseVideo).toHaveBeenCalled();
		expect(result.current.clipPlayback.isActive).toBe(false);
	});

	it("updateClipBounds でループ範囲が追従する", () => {
		const { result } = setupReadyManager();

		act(() => {
			result.current.startClip(10, 12, { loop: true });
		});
		mockPlayer.seekTo.mockClear();

		act(() => {
			result.current.updateClipBounds(15, 18);
		});

		// 旧終端(12)を過ぎても新終端(18)までは巻き戻さない
		mockPlayer.getCurrentTime.mockReturnValue(16);
		act(() => {
			vi.advanceTimersByTime(70);
		});
		expect(mockPlayer.seekTo).not.toHaveBeenCalled();

		// 新終端到達で新しい先頭(15)へ
		mockPlayer.getCurrentTime.mockReturnValue(18.05);
		act(() => {
			vi.advanceTimersByTime(70);
		});
		expect(mockPlayer.seekTo).toHaveBeenCalledWith(15, true);
	});

	it("stopClip で一時停止して非アクティブになる", () => {
		const { result } = setupReadyManager();

		act(() => {
			result.current.startClip(10, 12, { loop: true });
		});
		act(() => {
			result.current.stopClip();
		});

		expect(mockPlayer.pauseVideo).toHaveBeenCalled();
		expect(result.current.clipPlayback.isActive).toBe(false);
	});

	it("YouTube 側 UI での一時停止（state=2）でクリップ試聴が解除される", () => {
		const { result } = setupReadyManager();

		act(() => {
			result.current.startClip(10, 12, { loop: true });
		});
		act(() => {
			result.current.onPlayerStateChange(2);
		});

		expect(result.current.clipPlayback.isActive).toBe(false);

		// 解除後は終端判定が走らない
		mockPlayer.seekTo.mockClear();
		mockPlayer.getCurrentTime.mockReturnValue(12.5);
		act(() => {
			vi.advanceTimersByTime(200);
		});
		expect(mockPlayer.seekTo).not.toHaveBeenCalled();
	});

	it("終了 <= 開始の範囲では開始しない", () => {
		const { result } = setupReadyManager();

		act(() => {
			result.current.startClip(12, 10, { loop: true });
		});

		expect(mockPlayer.playVideo).not.toHaveBeenCalled();
		expect(result.current.clipPlayback.isActive).toBe(false);
	});

	it("プレイヤー未準備では開始しない", () => {
		const { result } = renderHook(() => useYouTubePlayerManager({ initialVideoId: "v" }));

		act(() => {
			result.current.startClip(10, 12, { loop: true });
		});

		expect(result.current.clipPlayback.isActive).toBe(false);
	});
});
