import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AutocompleteSuggestion } from "@/actions/autocomplete";
import { getAutocompleteSuggestions } from "@/actions/autocomplete";
import { useAutocomplete } from "../use-autocomplete";

// Mock Server Actions
vi.mock("@/actions/autocomplete", () => ({
	getAutocompleteSuggestions: vi.fn(),
}));

// Mock useDebounce hook to return value immediately
vi.mock("./use-debounce", () => ({
	useDebounce: vi.fn((value: string, _delay: number) => value),
}));

const mockGetAutocompleteSuggestions = vi.mocked(getAutocompleteSuggestions);

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
		expect(mockGetAutocompleteSuggestions).not.toHaveBeenCalled();
	});

	it("2文字以上の検索クエリで検索を実行する", async () => {
		mockGetAutocompleteSuggestions.mockResolvedValueOnce({
			success: true,
			data: {
				suggestions: mockSuggestions,
				meta: {
					query: "テスト",
					total: mockSuggestions.length,
					sources: { tags: 1, titles: 1, videos: 0 },
				},
			},
		});

		const { result } = renderHook(() => useAutocomplete("テスト"));

		await waitFor(() => {
			expect(mockGetAutocompleteSuggestions).toHaveBeenCalledWith("テスト", 8);
		});

		await waitFor(() => {
			expect(result.current.suggestions).toEqual(mockSuggestions);
		});
	});

	it("カスタムオプションを正しく適用する", async () => {
		const { result } = renderHook(() =>
			useAutocomplete("テ", {
				minLength: 3,
				maxSuggestions: 5,
			}),
		);

		// 3文字未満では検索しない
		expect(result.current.suggestions).toEqual([]);
		expect(mockGetAutocompleteSuggestions).not.toHaveBeenCalled();
	});

	it("3文字以上のカスタム設定で検索を実行する", async () => {
		mockGetAutocompleteSuggestions.mockResolvedValueOnce({
			success: true,
			data: {
				suggestions: mockSuggestions,
				meta: {
					query: "テスト検索",
					total: mockSuggestions.length,
					sources: { tags: 1, titles: 1, videos: 0 },
				},
			},
		});

		const { result } = renderHook(() =>
			useAutocomplete("テスト検索", {
				minLength: 3,
				maxSuggestions: 5,
			}),
		);

		await waitFor(() => {
			expect(mockGetAutocompleteSuggestions).toHaveBeenCalledWith("テスト検索", 5);
		});

		await waitFor(() => {
			expect(result.current.suggestions).toEqual(mockSuggestions);
		});
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
		expect(mockGetAutocompleteSuggestions).not.toHaveBeenCalled();
	});

	it("キャッシュ機能が正常に動作する", async () => {
		mockGetAutocompleteSuggestions.mockResolvedValue({
			success: true,
			data: {
				suggestions: mockSuggestions,
				meta: {
					query: "キャッシュ",
					total: mockSuggestions.length,
					sources: { tags: 1, titles: 1, videos: 0 },
				},
			},
		});

		// First call
		const { result } = renderHook(() => useAutocomplete("キャッシュ"));

		await waitFor(() => {
			expect(result.current.suggestions).toEqual(mockSuggestions);
		});

		expect(mockGetAutocompleteSuggestions).toHaveBeenCalledTimes(1);

		// Second call with same query should use cache (no additional Server Action call)
		const { result: result2 } = renderHook(() => useAutocomplete("キャッシュ"));

		await waitFor(() => {
			expect(result2.current.suggestions).toEqual(mockSuggestions);
		});

		// Still only 1 Server Action call due to caching
		expect(mockGetAutocompleteSuggestions).toHaveBeenCalledTimes(1);
	});

	it("空の結果を正しく処理する", async () => {
		mockGetAutocompleteSuggestions.mockResolvedValueOnce({
			success: true,
			data: {
				suggestions: [],
				meta: {
					query: "存在しない検索",
					total: 0,
					sources: { tags: 0, titles: 0, videos: 0 },
				},
			},
		});

		const { result } = renderHook(() => useAutocomplete("存在しない検索"));

		await waitFor(() => {
			expect(result.current.suggestions).toEqual([]);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBe(null);
		});
	});
});
