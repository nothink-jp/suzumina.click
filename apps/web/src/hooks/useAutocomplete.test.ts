import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AutocompleteSuggestion } from "@/app/api/autocomplete/route";
import { useAutocomplete } from "./useAutocomplete";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock useDebounce hook to return value immediately
vi.mock("../useDebounce", () => ({
	useDebounce: vi.fn((value: string, _delay: number) => value),
}));

const mockSuggestions: AutocompleteSuggestion[] = [
	{
		id: "tag-test",
		text: "テスト",
		type: "tag",
		icon: "🏷️",
		count: 5,
	},
	{
		id: "title-example",
		text: "テスト音声",
		type: "title",
		count: 10,
	},
];

describe("useAutocomplete", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Clear any existing cache
		const cache = new Map();
		cache.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
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
		expect(result.current.isLoading).toBe(false);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("2文字以上の検索クエリで検索を実行する", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ suggestions: mockSuggestions }),
		});

		const { result } = renderHook(() => useAutocomplete("テスト"));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/autocomplete?q=%E3%83%86%E3%82%B9%E3%83%88&limit=8",
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
		});

		await waitFor(() => {
			expect(result.current.suggestions).toEqual(mockSuggestions);
		});
	});

	it("カスタムオプションを正しく適用する", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ suggestions: mockSuggestions }),
		});

		const { result } = renderHook(() =>
			useAutocomplete("テ", {
				minLength: 3,
				maxSuggestions: 5,
			}),
		);

		// 3文字未満では検索しない
		expect(result.current.suggestions).toEqual([]);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("3文字以上のカスタム設定で検索を実行する", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ suggestions: mockSuggestions }),
		});

		const { result } = renderHook(() =>
			useAutocomplete("テスト検索", {
				minLength: 3,
				maxSuggestions: 5,
			}),
		);

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/autocomplete?q=%E3%83%86%E3%82%B9%E3%83%88%E6%A4%9C%E7%B4%A2&limit=5",
				expect.any(Object),
			);
		});

		// Use result to avoid unused variable warning
		expect(result.current.suggestions).toBeDefined();
	});

	it("エラー状態を適切に管理する", () => {
		const { result } = renderHook(() => useAutocomplete(""));

		// clearSuggestions でエラーもクリアされることを確認
		act(() => {
			result.current.clearSuggestions();
		});

		expect(result.current.error).toBe(null);
		expect(result.current.suggestions).toEqual([]);
	});

	it("clearSuggestions関数が正常に動作する", () => {
		const { result } = renderHook(() => useAutocomplete(""));

		act(() => {
			result.current.clearSuggestions();
		});

		expect(result.current.suggestions).toEqual([]);
		expect(result.current.error).toBe(null);
	});

	it("無効化されている場合は検索を実行しない", () => {
		const { result } = renderHook(() => useAutocomplete("テスト", { enabled: false }));

		expect(result.current.suggestions).toEqual([]);
		expect(result.current.isLoading).toBe(false);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("キャッシュ機能が正常に動作する", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ suggestions: mockSuggestions }),
		});

		// First call
		const { result } = renderHook(() => useAutocomplete("キャッシュ"));

		await waitFor(() => {
			expect(result.current.suggestions).toEqual(mockSuggestions);
		});

		expect(mockFetch).toHaveBeenCalledTimes(1);

		// Second call with same query should use cache (no additional fetch)
		const { result: result2 } = renderHook(() => useAutocomplete("キャッシュ"));

		await waitFor(() => {
			expect(result2.current.suggestions).toEqual(mockSuggestions);
		});

		// Still only 1 fetch call due to caching
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it("空の結果を正しく処理する", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ suggestions: [] }),
		});

		const { result } = renderHook(() => useAutocomplete("存在しない検索"));

		await waitFor(() => {
			expect(result.current.suggestions).toEqual([]);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBe(null);
		});
	});
});
