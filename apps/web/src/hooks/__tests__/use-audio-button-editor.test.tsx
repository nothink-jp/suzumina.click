import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioButtonEditor } from "../use-audio-button-editor";

// I/O ショートカットの検証対象は「現在再生位置を開始/終了に設定する」動作のため、
// プレイヤー由来の currentTime を固定値で返すモックにする（jsdom に実プレイヤーは無い）
const mockStartClip = vi.fn();
const mockStopClip = vi.fn();
const mockUpdateClipBounds = vi.fn();
const mockSeekTo = vi.fn();
let mockClipPlayback = { isActive: false, isLoop: false };

vi.mock("../use-youtube-player-manager", () => ({
	useYouTubePlayerManager: () => ({
		youtubePlayerRef: { current: null },
		videoId: "dQw4w9WgXcQ",
		videoDuration: 600,
		currentTime: 42.5,
		isPlayerReady: true,
		isLoading: false,
		clipPlayback: mockClipPlayback,
		setVideoId: vi.fn(),
		onPlayerReady: vi.fn(),
		onPlayerStateChange: vi.fn(),
		startClip: mockStartClip,
		stopClip: mockStopClip,
		updateClipBounds: mockUpdateClipBounds,
		seekTo: mockSeekTo,
		getCurrentPlayerTime: vi.fn(),
	}),
}));

function pressKey(key: string, options: KeyboardEventInit = {}) {
	act(() => {
		document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...options }));
	});
}

describe("useAudioButtonEditor の I/O ショートカット（SPR-266）", () => {
	const config = { videoId: "dQw4w9WgXcQ", videoTitle: "テスト動画", videoDuration: 600 };

	beforeEach(() => {
		vi.clearAllMocks();
		mockClipPlayback = { isActive: false, isLoop: false };
	});

	it("I キーで現在再生位置が開始時間になる", () => {
		const { result } = renderHook(() => useAudioButtonEditor(config));

		pressKey("i");

		expect(result.current.timeAdjustment.startTime).toBe(42.5);
	});

	it("O キーで現在再生位置が終了時間になる（大文字も可）", () => {
		const { result } = renderHook(() => useAudioButtonEditor(config));

		pressKey("O");

		expect(result.current.timeAdjustment.endTime).toBe(42.5);
	});

	it("入力欄フォーカス中は無視される", () => {
		const { result } = renderHook(() => useAudioButtonEditor(config));
		const input = document.createElement("input");
		document.body.appendChild(input);

		act(() => {
			input.dispatchEvent(new KeyboardEvent("keydown", { key: "i", bubbles: true }));
		});

		expect(result.current.timeAdjustment.startTime).toBe(0);
		input.remove();
	});

	it("修飾キー付き・キーリピートは無視される", () => {
		const { result } = renderHook(() => useAudioButtonEditor(config));

		pressKey("i", { metaKey: true });
		pressKey("i", { ctrlKey: true });
		pressKey("o", { repeat: true });

		expect(result.current.timeAdjustment.startTime).toBe(0);
		// 初期 endTime は initialStartTime + 10 = 10
		expect(result.current.timeAdjustment.endTime).toBe(10);
	});

	it("処理中（作成/更新中）は無効化される", () => {
		const { result } = renderHook(() => useAudioButtonEditor(config));

		act(() => {
			result.current.setState.setIsProcessing(true);
		});
		pressKey("i");

		expect(result.current.timeAdjustment.startTime).toBe(0);
	});
});

describe("useAudioButtonEditor の試聴（SPR-288）", () => {
	const config = {
		videoId: "dQw4w9WgXcQ",
		videoTitle: "テスト動画",
		videoDuration: 600,
		initialStartTime: 30,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockClipPlayback = { isActive: false, isLoop: false };
	});

	it("ループ再生はプリロール込みの範囲で始まる（既定 ON）", () => {
		const { result } = renderHook(() => useAudioButtonEditor(config));

		act(() => {
			result.current.audition.onToggleLoop();
		});

		// start 30 - preroll 1.5 = 28.5 → end 40
		expect(mockStartClip).toHaveBeenCalledWith(28.5, 40, { loop: true });
	});

	it("プリロール OFF では開始位置ちょうどから鳴る", () => {
		const { result } = renderHook(() => useAudioButtonEditor(config));

		act(() => {
			result.current.audition.onTogglePreroll();
		});
		act(() => {
			result.current.audition.onToggleLoop();
		});

		expect(result.current.audition.prerollEnabled).toBe(false);
		expect(mockStartClip).toHaveBeenCalledWith(30, 40, { loop: true });
	});

	it("ループ中のトグルは停止になる", () => {
		mockClipPlayback = { isActive: true, isLoop: true };
		const { result } = renderHook(() => useAudioButtonEditor(config));

		act(() => {
			result.current.audition.onToggleLoop();
		});

		expect(mockStopClip).toHaveBeenCalled();
		expect(mockStartClip).not.toHaveBeenCalled();
	});

	it("頭を聴く: 開始境界の前後を1回再生", () => {
		const { result } = renderHook(() => useAudioButtonEditor(config));

		act(() => {
			result.current.audition.onPlayHead();
		});

		// [30 - 1.5, 30 + 2]
		expect(mockStartClip).toHaveBeenCalledWith(28.5, 32, { loop: false });
	});

	it("末尾を聴く: 終了境界の手前を1回再生して境界で止める", () => {
		const { result } = renderHook(() => useAudioButtonEditor(config));

		act(() => {
			result.current.audition.onPlayTail();
		});

		// [40 - 2, 40]
		expect(mockStartClip).toHaveBeenCalledWith(38, 40, { loop: false });
	});

	it("境界を調整するとプレイヤーが追従シークする（trailing throttle）", async () => {
		const { result } = renderHook(() => useAudioButtonEditor(config));

		act(() => {
			result.current.timeAdjustment.adjustStartTime(1);
		});

		await waitFor(() => {
			expect(mockSeekTo).toHaveBeenCalledWith(31);
		});
	});

	it("ループ試聴中の境界調整は範囲の正本にも即時反映される", () => {
		mockClipPlayback = { isActive: true, isLoop: true };
		const { result } = renderHook(() => useAudioButtonEditor(config));

		act(() => {
			result.current.timeAdjustment.adjustEndTime(2);
		});

		// end 40 → 42、from はプリロール込み
		expect(mockUpdateClipBounds).toHaveBeenCalledWith(28.5, 42);
	});
});
