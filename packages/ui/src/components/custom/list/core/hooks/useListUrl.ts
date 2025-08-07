/**
 * URL同期用のフック（改善版）
 */

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { FilterConfig } from "../types";
import { getDefaultFilterValues } from "../utils/filterHelpers";

interface UseListUrlOptions {
	/** フィルター設定 */
	filters?: Record<string, FilterConfig>;
	/** デフォルトのページサイズ */
	defaultPageSize?: number;
	/** デフォルトのソート */
	defaultSort?: string;
}

export function useListUrl(options: UseListUrlOptions = {}) {
	const { filters = {}, defaultPageSize = 12, defaultSort } = options;
	const searchParams = useSearchParams();

	// URLの更新フラグを管理
	const isUpdatingUrl = useRef(false);
	const lastUrlRef = useRef<string>("");

	// 現在のパラメータを解析
	const currentParams = useMemo(() => {
		const page = Number.parseInt(searchParams.get("page") || "1", 10);
		const itemsPerPage = Number.parseInt(
			searchParams.get("limit") || defaultPageSize.toString(),
			10,
		);
		const sort = searchParams.get("sort") || defaultSort || "";
		const search = searchParams.get("q") || "";

		// フィルターを解析
		const defaultFilterValues = getDefaultFilterValues(filters);
		const filterValues: Record<string, unknown> = { ...defaultFilterValues };
		Object.entries(filters).forEach(([key, config]) => {
			const value = searchParams.get(key);

			if (value !== null) {
				// 型に応じて変換
				if (config.type === "multiselect" || config.type === "tags") {
					// URLSearchParamsは既にデコード済みの値を返すので追加のデコードは不要
					// パイプ文字"|"を区切り文字として使用
					if (value.includes("|")) {
						// 新形式: パイプ区切り
						filterValues[key] = value.split("|").filter(Boolean);
					} else if (value.includes(",") && !value.includes(" ")) {
						// 旧形式: カンマ区切り（スペースを含まない場合のみ）
						filterValues[key] = value.split(",").filter(Boolean);
					} else {
						// 単一の値（スペースを含む可能性がある）
						filterValues[key] = [value];
					}
				} else if (config.type === "boolean") {
					filterValues[key] = value === "true";
				} else if (config.type === "range") {
					const [min, max] = value.split("-");
					filterValues[key] = {
						min: min ? Number.parseFloat(min) : undefined,
						max: max ? Number.parseFloat(max) : undefined,
					};
				} else if (config.type === "dateRange") {
					// ISO日付形式（YYYY-MM-DD~YYYY-MM-DD）を正確に分割
					const separatorIndex = value.indexOf("~");
					if (separatorIndex !== -1) {
						const start = value.substring(0, separatorIndex);
						const end = value.substring(separatorIndex + 1);
						filterValues[key] = {
							start: start || undefined,
							end: end || undefined,
						};
					} else {
						// 旧形式（ハイフン区切り）のフォールバック
						const parts = value.split("-");
						if (parts.length >= 6) {
							// YYYY-MM-DD-YYYY-MM-DD形式を想定
							const start = parts.slice(0, 3).join("-");
							const end = parts.slice(3).join("-");
							filterValues[key] = {
								start: start || undefined,
								end: end || undefined,
							};
						} else {
							// 解析できない場合は空の範囲
							filterValues[key] = {
								start: undefined,
								end: undefined,
							};
						}
					}
				} else {
					filterValues[key] = value;
				}
			}
			// value が null の場合は、defaultFilterValues の値がそのまま使われる
		});

		return {
			page,
			itemsPerPage,
			sort,
			search,
			filters: filterValues,
		};
	}, [searchParams, filters, defaultPageSize, defaultSort]);

	// URLを更新する関数
	const updateUrl = useCallback(
		(
			updates: Partial<{
				page: number;
				itemsPerPage: number;
				sort: string;
				search: string;
				filters: Record<string, unknown>;
			}>,
		) => {
			const params = new URLSearchParams(searchParams.toString());

			// ページ
			if (updates.page !== undefined) {
				if (updates.page === 1) {
					params.delete("page");
				} else {
					params.set("page", updates.page.toString());
				}
			}

			// ページサイズ
			if (updates.itemsPerPage !== undefined) {
				if (updates.itemsPerPage === defaultPageSize) {
					params.delete("limit");
				} else {
					params.set("limit", updates.itemsPerPage.toString());
				}
			}

			// ソート
			if (updates.sort !== undefined) {
				if (updates.sort === "" || updates.sort === defaultSort) {
					params.delete("sort");
				} else {
					params.set("sort", updates.sort);
				}
			}

			// 検索
			if (updates.search !== undefined) {
				if (updates.search === "") {
					params.delete("q");
				} else {
					params.set("q", updates.search);
				}
			}

			// フィルター
			if (updates.filters !== undefined) {
				// まず、既存のフィルターパラメータをすべて削除
				Object.keys(filters).forEach((key) => {
					params.delete(key);
				});

				// 新しいフィルター値を設定
				Object.entries(updates.filters).forEach(([key, value]) => {
					const config = filters[key];
					const defaultValue = getDefaultFilterValues(filters)[key];

					// "all"値、空値、またはデフォルト値と同じ場合はURLから削除
					if (
						value === undefined ||
						value === null ||
						value === "" ||
						(config?.showAll && value === "all") ||
						(Array.isArray(value) && value.length === 0) ||
						value === defaultValue
					) {
						// すでに削除されているので何もしない
					} else {
						// 型に応じてシリアライズ
						if (Array.isArray(value)) {
							// パイプ文字で結合（URLSearchParamsが自動的にエンコードする）
							// これによりスペースやカンマを含む値も正しく扱える
							const joined = value.map((v) => String(v)).join("|");
							params.set(key, joined);
						} else if (typeof value === "object" && config?.type === "range") {
							const rangeValue = value as { min?: number; max?: number };
							if (rangeValue.min !== undefined || rangeValue.max !== undefined) {
								params.set(key, `${rangeValue.min || ""}-${rangeValue.max || ""}`);
							} else {
								// すでに削除されている
							}
						} else if (typeof value === "object" && config?.type === "dateRange") {
							const dateValue = value as { start?: string; end?: string };
							if (dateValue.start !== undefined || dateValue.end !== undefined) {
								// チルダ（~）を区切り文字として使用
								params.set(key, `${dateValue.start || ""}~${dateValue.end || ""}`);
							} else {
								// すでに削除されている
							}
						} else {
							params.set(key, value.toString());
						}
					}
				});
			}

			// URLを更新（スクロール位置を保持）
			const newUrl = params.toString() ? `?${params.toString()}` : "";
			const fullUrl = `${window.location.pathname}${newUrl}`;

			// 同じURLへの更新は無視
			if (lastUrlRef.current === fullUrl) {
				return;
			}

			lastUrlRef.current = fullUrl;
			isUpdatingUrl.current = true;

			// History APIを使用してURLを更新（ページリロードなし）
			window.history.pushState({}, "", fullUrl);

			// popstateイベントを手動で発火させて、useSearchParamsを更新
			window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
		},
		[searchParams, filters, defaultPageSize, defaultSort],
	);

	// 個別の更新関数
	const setPage = useCallback(
		(page: number) => {
			updateUrl({ page });
		},
		[updateUrl],
	);

	const setItemsPerPage = useCallback(
		(itemsPerPage: number) => {
			updateUrl({ itemsPerPage, page: 1 }); // ページサイズ変更時は1ページ目へ
		},
		[updateUrl],
	);

	const setSort = useCallback(
		(sort: string) => {
			updateUrl({ sort, page: 1 }); // ソート変更時は1ページ目へ
		},
		[updateUrl],
	);

	const setSearch = useCallback(
		(search: string) => {
			updateUrl({ search, page: 1 }); // 検索変更時は1ページ目へ
		},
		[updateUrl],
	);

	const setFilter = useCallback(
		(key: string, value: unknown) => {
			updateUrl({
				filters: { ...currentParams.filters, [key]: value },
				page: 1, // フィルター変更時は1ページ目へ
			});
		},
		[updateUrl, currentParams.filters],
	);

	const resetFilters = useCallback(() => {
		const defaultFilters = getDefaultFilterValues(filters);

		updateUrl({
			filters: defaultFilters,
			search: "",
			page: 1,
		});
	}, [updateUrl, filters]);

	// filters オブジェクトの参照を安定化
	const stableParams = useMemo(() => {
		// filtersの内容が同じであれば同じ参照を保持
		const filtersStr = JSON.stringify(currentParams.filters);
		return {
			...currentParams,
			filters: JSON.parse(filtersStr),
		};
	}, [currentParams]);

	// URLの更新フラグをリセット
	useEffect(() => {
		if (isUpdatingUrl.current) {
			// 次のレンダリングサイクルでフラグをリセット
			const timer = setTimeout(() => {
				isUpdatingUrl.current = false;
			}, 0);
			return () => clearTimeout(timer);
		}
	}, []);

	return {
		params: stableParams,
		setPage,
		setItemsPerPage,
		setSort,
		setSearch,
		setFilter,
		resetFilters,
	};
}
