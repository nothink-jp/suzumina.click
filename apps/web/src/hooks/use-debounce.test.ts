import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDebounce } from "./use-debounce";

// タイマーをモック化
vi.useFakeTimers();

describe("useDebounce", () => {
	it("初期値を即座に返す", () => {
		const { result } = renderHook(() => useDebounce("initial", 500));
		expect(result.current).toBe("initial");
	});

	it("遅延後に新しい値を返す", () => {
		const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
			initialProps: { value: "initial", delay: 500 },
		});

		expect(result.current).toBe("initial");

		// 値を更新
		rerender({ value: "updated", delay: 500 });
		expect(result.current).toBe("initial"); // まだ更新されていない

		// 遅延時間を進める
		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(result.current).toBe("updated");
	});

	it("連続した更新で最後の値のみ反映する", () => {
		const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
			initialProps: { value: "initial", delay: 500 },
		});

		// 連続で値を更新
		rerender({ value: "update1", delay: 500 });
		rerender({ value: "update2", delay: 500 });
		rerender({ value: "final", delay: 500 });

		// 遅延時間の途中では元の値のまま
		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(result.current).toBe("initial");

		// 遅延時間が完了すると最後の値が反映される
		act(() => {
			vi.advanceTimersByTime(200);
		});
		expect(result.current).toBe("final");
	});

	it("異なる遅延時間で動作する", () => {
		const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
			initialProps: { value: "initial", delay: 1000 },
		});

		rerender({ value: "updated", delay: 1000 });

		// 500msでは更新されない
		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(result.current).toBe("initial");

		// 1000ms経過で更新される
		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(result.current).toBe("updated");
	});

	it("数値型でも正常に動作する", () => {
		const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
			initialProps: { value: 0, delay: 300 },
		});

		expect(result.current).toBe(0);

		rerender({ value: 42, delay: 300 });

		act(() => {
			vi.advanceTimersByTime(300);
		});

		expect(result.current).toBe(42);
	});
});
