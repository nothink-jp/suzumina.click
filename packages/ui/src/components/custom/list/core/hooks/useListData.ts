/**
 * データ管理用のフック
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ListDataSource, ListError, StandardListParams } from "../types";

interface ListDataState<T> {
	data: ListDataSource<T> | null;
	loading: boolean;
	error: ListError | null;
}

type ListDataAction<T> =
	| { type: "FETCH_START" }
	| { type: "FETCH_SUCCESS"; payload: ListDataSource<T> }
	| { type: "FETCH_ERROR"; payload: ListError };

function listDataReducer<T>(state: ListDataState<T>, action: ListDataAction<T>): ListDataState<T> {
	switch (action.type) {
		case "FETCH_START":
			return { ...state, loading: true, error: null };
		case "FETCH_SUCCESS":
			return { data: action.payload, loading: false, error: null };
		case "FETCH_ERROR":
			return { ...state, loading: false, error: action.payload };
		default:
			return state;
	}
}

interface UseListDataOptions<T> {
	/** データ取得関数 */
	fetchFn: (params: StandardListParams) => Promise<ListDataSource<T>>;
	/** 初期データ */
	initialData?: ListDataSource<T>;
	/** エラーハンドラー */
	onError?: (error: ListError) => void;
	/** デバウンス時間（ミリ秒） */
	debounceMs?: number;
}

export function useListData<T>(params: StandardListParams, options: UseListDataOptions<T>) {
	const { fetchFn, initialData, onError, debounceMs = 0 } = options;

	const [state, dispatch] = useReducer(listDataReducer<T>, {
		data: initialData || null,
		loading: !initialData,
		error: null,
	});

	const abortControllerRef = useRef<AbortController | null>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const fetchData = useCallback(async () => {
		// 前回のリクエストをキャンセル
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		// デバウンスタイマーをクリア
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		// デバウンス処理
		if (debounceMs > 0) {
			return new Promise<void>((resolve) => {
				timeoutRef.current = setTimeout(async () => {
					await performFetch();
					resolve();
				}, debounceMs);
			});
		}
		return performFetch();

		async function performFetch() {
			const abortController = new AbortController();
			abortControllerRef.current = abortController;

			dispatch({ type: "FETCH_START" });

			try {
				const data = await fetchFn(params);

				// リクエストがキャンセルされていないかチェック
				if (!abortController.signal.aborted) {
					dispatch({ type: "FETCH_SUCCESS", payload: data });
				}
			} catch (error) {
				// キャンセルエラーは無視
				if (error instanceof Error && error.name === "AbortError") {
					return;
				}

				const listError: ListError = {
					type: "fetch",
					message: error instanceof Error ? error.message : "データの取得に失敗しました",
					retry: () => performFetch(),
				};

				dispatch({ type: "FETCH_ERROR", payload: listError });
				onError?.(listError);
			}
		}
	}, [
		params.page,
		params.itemsPerPage,
		params.sort,
		params.search,
		// filtersオブジェクトをJSON文字列化して比較
		JSON.stringify(params.filters),
		fetchFn,
		debounceMs,
		onError,
	]);

	// パラメータが変更されたらデータを再取得
	useEffect(() => {
		fetchData();

		// クリーンアップ
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [fetchData]);

	return {
		...state,
		refresh: fetchData,
	};
}
