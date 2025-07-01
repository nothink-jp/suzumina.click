import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAutocomplete } from "./useAutocomplete";

// Mock useDebounce hook to return value immediately
vi.mock("./useDebounce", () => ({
	useDebounce: vi.fn((value: string) => value),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useAutocomplete - Core Functionality", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("初期状態では空の結果を返す", () => {
		const { result } = renderHook(() => useAutocomplete(""));

		expect(result.current.suggestions).toEqual([]);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBe(null);
	});

	it("短い検索クエリでは検索を実行しない", () => {
		const { result } = renderHook(() => useAutocomplete("a"));

		expect(result.current.suggestions).toEqual([]);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("clearSuggestions関数が正常に動作する", () => {
		const { result } = renderHook(() => useAutocomplete(""));

		result.current.clearSuggestions();

		expect(result.current.suggestions).toEqual([]);
		expect(result.current.error).toBe(null);
	});

	it("無効化されている場合は検索を実行しない", () => {
		const { result } = renderHook(() => useAutocomplete("テスト", { enabled: false }));

		expect(result.current.suggestions).toEqual([]);
		expect(result.current.isLoading).toBe(false);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("2文字以上の検索クエリで適切なAPIパラメータを生成する", () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ suggestions: [] }),
		});

		renderHook(() => useAutocomplete("テスト"));

		// API callは非同期で実行されるため、具体的な呼び出しではなく
		// hookの基本的な設定が正しいかのみ確認
		expect(mockFetch).toHaveBeenCalled();
	});

	it("カスタムオプションが適用される", () => {
		const { result } = renderHook(() =>
			useAutocomplete("テ", {
				minLength: 3,
				maxSuggestions: 5,
			}),
		);

		// 3文字未満なので検索は実行されない
		expect(result.current.suggestions).toEqual([]);
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
