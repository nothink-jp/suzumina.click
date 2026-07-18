import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioButtonEditor } from "../use-audio-button-editor";

// I/O ショートカットの検証対象は「現在再生位置を開始/終了に設定する」動作のため、
// プレイヤー由来の currentTime を固定値で返すモックにする（jsdom に実プレイヤーは無い）
vi.mock("../use-youtube-player-manager", () => ({
	useYouTubePlayerManager: () => ({
		youtubePlayerRef: { current: null },
		videoId: "dQw4w9WgXcQ",
		videoDuration: 600,
		currentTime: 42.5,
		isPlayerReady: true,
		isLoading: false,
		setVideoId: vi.fn(),
		onPlayerReady: vi.fn(),
		onPlayerStateChange: vi.fn(),
		playRange: vi.fn(),
		seekTo: vi.fn(),
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
