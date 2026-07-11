/**
 * @vitest-environment happy-dom
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AudioControls } from "../audio-player";
import { useAudioPlayback } from "../use-audio-playback";

/** audioPlayerRef / progressFillRef に実体を注入した hook を用意する */
function setupPlayback(options?: Parameters<typeof useAudioPlayback>[0]) {
	const result = renderHook(() => useAudioPlayback(options)).result;
	const controls = {
		play: vi.fn(),
		pause: vi.fn(),
		stop: vi.fn(),
		setVolume: vi.fn(),
		isPlaying: false,
		isReady: true,
	} satisfies AudioControls;
	const fill = document.createElement("span");
	act(() => {
		result.current.audioPlayerRef.current = controls;
		result.current.progressFillRef.current = fill;
	});
	return { result, controls, fill };
}

describe("useAudioPlayback", () => {
	it("停止中の handleToggle は isLoading にして play を呼ぶ（SPR-200 スピナー経路）", () => {
		const { result, controls } = setupPlayback();

		act(() => result.current.handleToggle());

		expect(result.current.isLoading).toBe(true);
		expect(result.current.isPlaying).toBe(false);
		expect(controls.play).toHaveBeenCalledTimes(1);
	});

	it("onPlay で再生中になり isLoading が解除され、onPlay/onPlayStateChange(true) を通知する", () => {
		const onPlay = vi.fn();
		const onPlayStateChange = vi.fn();
		const { result } = setupPlayback({ onPlay, onPlayStateChange });

		act(() => result.current.handleToggle());
		act(() => result.current.playerHandlers.onPlay());

		expect(result.current.isPlaying).toBe(true);
		expect(result.current.isLoading).toBe(false);
		expect(onPlay).toHaveBeenCalledTimes(1);
		expect(onPlayStateChange).toHaveBeenLastCalledWith(true);
	});

	it("再生中の handleToggle は pause を呼ぶ", () => {
		const { result, controls } = setupPlayback();

		act(() => result.current.playerHandlers.onPlay());
		act(() => result.current.handleToggle());

		expect(controls.pause).toHaveBeenCalledTimes(1);
		expect(controls.play).not.toHaveBeenCalled();
	});

	it("onProgress は進捗フィルの width を DOM へ直接書き込む", () => {
		const { result, fill } = setupPlayback();

		act(() => result.current.playerHandlers.onProgress(42));

		expect(fill.style.width).toBe("42%");
	});

	it("onPause で停止し進捗をリセットし、onPlayStateChange(false) を通知する", () => {
		const onPlayStateChange = vi.fn();
		const { result, fill } = setupPlayback({ onPlayStateChange });

		act(() => result.current.playerHandlers.onPlay());
		act(() => result.current.playerHandlers.onProgress(40));
		act(() => result.current.playerHandlers.onPause());

		expect(result.current.isPlaying).toBe(false);
		expect(fill.style.width).toBe("0%");
		expect(onPlayStateChange).toHaveBeenLastCalledWith(false);
	});

	it("onEnd でも onPause と同一の停止処理になる", () => {
		const onPlayStateChange = vi.fn();
		const { result, fill } = setupPlayback({ onPlayStateChange });

		act(() => result.current.playerHandlers.onPlay());
		act(() => result.current.playerHandlers.onProgress(80));
		act(() => result.current.playerHandlers.onEnd());

		expect(result.current.isPlaying).toBe(false);
		expect(result.current.isLoading).toBe(false);
		expect(fill.style.width).toBe("0%");
		expect(onPlayStateChange).toHaveBeenLastCalledWith(false);
	});

	it("コールバック未指定（AudioButton 相当）でも状態遷移だけで完結する", () => {
		const { result } = setupPlayback();

		act(() => result.current.playerHandlers.onPlay());
		expect(result.current.isPlaying).toBe(true);

		act(() => result.current.playerHandlers.onEnd());
		expect(result.current.isPlaying).toBe(false);
	});
});
