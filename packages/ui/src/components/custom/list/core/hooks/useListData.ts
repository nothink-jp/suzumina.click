/**
 * データ管理用のフック
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ListDataSource, ListError, StandardListParams } from "../types";

interface ListDataState<T> {
	data: ListDataSource<T> | null;
	loading: boolean;
	error: ListError | null;
	/** データが存在している状態でのローディング（フリッカー防止用） */
	isRefreshing: boolean;
}

type ListDataAction<T> =
	| { type: "FETCH_START" }
	| { type: "FETCH_SUCCESS"; payload: ListDataSource<T> }
	| { type: "FETCH_ERROR"; payload: ListError };

function listDataReducer<T>(state: ListDataState<T>, action: ListDataAction<T>): ListDataState<T> {
	switch (action.type) {
		case "FETCH_START":
			// データがある場合はリフレッシュ状態、ない場合は通常のローディング状態
			return state.data
				? { ...state, isRefreshing: true, error: null }
				: { ...state, loading: true, isRefreshing: false, error: null };
		case "FETCH_SUCCESS":
			return {
				data: action.payload,
				loading: false,
				isRefreshing: false,
				error: null,
			};
		case "FETCH_ERROR":
			return {
				...state,
				loading: false,
				isRefreshing: false,
				error: action.payload,
			};
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
		isRefreshing: false,
		error: null,
	});

	const abortControllerRef = useRef<AbortController | null>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	// paramsの各値をメモ化して依存関係を安定化
	const paramsRef = useRef(params);
	paramsRef.current = params;

	// パラメータの比較関数
	const areParamsEqual = useCallback((prev: StandardListParams, next: StandardListParams) => {
		return (
			prev.page === next.page &&
			prev.itemsPerPage === next.itemsPerPage &&
			prev.sort === next.sort &&
			prev.search === next.search &&
			JSON.stringify(prev.filters) === JSON.stringify(next.filters)
		);
	}, []);

	// 前回のパラメータを保持
	const prevParamsRef = useRef(params);

	const fetchData = useCallback(async () => {
		// 前回のリクエストをキャンセル
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}

		// デバウンスタイマーをクリア
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
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
				// 現在のパラメータを使用
				const data = await fetchFn(paramsRef.current);

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
	}, [fetchFn, debounceMs, onError]);

	// パラメータが変更されたらデータを再取得
	useEffect(() => {
		// パラメータが実際に変更されたかチェック
		if (!areParamsEqual(prevParamsRef.current, params)) {
			if (typeof window !== "undefined") {
				console.log("useListData: Params changed, fetching data", {
					prev: prevParamsRef.current,
					next: params,
					equal: areParamsEqual(prevParamsRef.current, params),
				});
			}
			prevParamsRef.current = params;
			fetchData();
		}
	}, [params, fetchData, areParamsEqual]);

	// クリーンアップ
	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
				abortControllerRef.current = null;
			}
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
		};
	}, []);

	return {
		...state,
		refresh: fetchData,
	};
}
