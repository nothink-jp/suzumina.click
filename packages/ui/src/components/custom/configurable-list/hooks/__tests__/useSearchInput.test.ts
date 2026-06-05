import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSearchInput } from "../useSearchInput";

const keyEvent = (key: string) => ({ key }) as React.KeyboardEvent<HTMLInputElement>;

describe("useSearchInput", () => {
	it("初期値を保持し、変更で localSearchValue が更新される", () => {
		const onSearch = vi.fn();
		const { result } = renderHook(() => useSearchInput({ initialValue: "init", onSearch }));
		expect(result.current.localSearchValue).toBe("init");

		act(() => result.current.handleSearchChange("typed"));
		expect(result.current.localSearchValue).toBe("typed");
		// 変更だけでは onSearch を呼ばない
		expect(onSearch).not.toHaveBeenCalled();
	});

	it("Enter で onSearch を現在値で呼ぶ", () => {
		const onSearch = vi.fn();
		const { result } = renderHook(() => useSearchInput({ initialValue: "", onSearch }));
		act(() => result.current.handleSearchChange("hello"));
		act(() => result.current.handleSearchKeyDown(keyEvent("Enter")));
		expect(onSearch).toHaveBeenCalledWith("hello");
	});

	it("IME変換中(composition)の Enter では onSearch を呼ばない", () => {
		const onSearch = vi.fn();
		const { result } = renderHook(() => useSearchInput({ initialValue: "", onSearch }));
		act(() => result.current.handleSearchChange("かな"));
		act(() => result.current.handleCompositionStart());
		act(() => result.current.handleSearchKeyDown(keyEvent("Enter")));
		expect(onSearch).not.toHaveBeenCalled();

		// 変換確定後の Enter は呼ぶ
		act(() => result.current.handleCompositionEnd());
		act(() => result.current.handleSearchKeyDown(keyEvent("Enter")));
		expect(onSearch).toHaveBeenCalledWith("かな");
	});

	it("Enter 以外のキーでは呼ばない", () => {
		const onSearch = vi.fn();
		const { result } = renderHook(() => useSearchInput({ initialValue: "", onSearch }));
		act(() => result.current.handleSearchKeyDown(keyEvent("a")));
		expect(onSearch).not.toHaveBeenCalled();
	});

	it("外部 initialValue の変更に同期する", () => {
		const onSearch = vi.fn();
		const { result, rerender } = renderHook(
			({ initialValue }) => useSearchInput({ initialValue, onSearch }),
			{ initialProps: { initialValue: "a" } },
		);
		rerender({ initialValue: "b" });
		expect(result.current.localSearchValue).toBe("b");
	});
});
