import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlayCount } from "../use-play-count";

const incrementPlayCount = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/app/buttons/actions", () => ({
	incrementPlayCount: (...a: unknown[]) => incrementPlayCount(...a),
}));

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("usePlayCount", () => {
	it("初回再生はバッチ(1s)後に incrementPlayCount を呼ぶ", () => {
		const { result } = renderHook(() => usePlayCount());
		act(() => result.current.handlePlay("a"));
		// バッチ待ち前は未呼び出し
		expect(incrementPlayCount).not.toHaveBeenCalled();
		// バッチ 1s → 各増分 setTimeout(index*100)
		act(() => vi.advanceTimersByTime(1000));
		act(() => vi.advanceTimersByTime(100));
		expect(incrementPlayCount).toHaveBeenCalledWith("a");
		expect(incrementPlayCount).toHaveBeenCalledTimes(1);
	});

	it("同一セッションで再度再生してもデバウンスされ重複増分しない", () => {
		const { result } = renderHook(() => usePlayCount());
		act(() => result.current.handlePlay("a"));
		act(() => vi.advanceTimersByTime(1100));
		expect(incrementPlayCount).toHaveBeenCalledTimes(1);
		// 30秒以内の再生は無視（playedInSession に既存）
		act(() => result.current.handlePlay("a"));
		act(() => vi.advanceTimersByTime(1100));
		expect(incrementPlayCount).toHaveBeenCalledTimes(1);
	});

	it("複数ボタンはまとめて処理される", () => {
		const { result } = renderHook(() => usePlayCount());
		act(() => {
			result.current.handlePlay("a");
			result.current.handlePlay("b");
		});
		act(() => vi.advanceTimersByTime(1000));
		act(() => vi.advanceTimersByTime(200)); // index 0,1 → 0ms,100ms
		expect(incrementPlayCount).toHaveBeenCalledWith("a");
		expect(incrementPlayCount).toHaveBeenCalledWith("b");
	});

	it("cleanup はタイマーをクリアし以降増分しない", () => {
		const { result } = renderHook(() => usePlayCount());
		act(() => result.current.handlePlay("a"));
		act(() => result.current.cleanup());
		act(() => vi.advanceTimersByTime(2000));
		expect(incrementPlayCount).not.toHaveBeenCalled();
	});
});
