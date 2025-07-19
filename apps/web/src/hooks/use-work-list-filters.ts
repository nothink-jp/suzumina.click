"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export interface WorkListFilters {
	searchQuery: string;
	sortBy: string;
	categoryFilter: string;
	languageFilter: string;
	itemsPerPageValue: string;
}

export interface WorkListFiltersActions {
	setSearchQuery: (value: string) => void;
	setSortBy: (value: string) => void;
	setCategoryFilter: (value: string) => void;
	setLanguageFilter: (value: string) => void;
	setItemsPerPageValue: (value: string) => void;
	handleSearch: () => void;
	handleSortChange: (value: string) => void;
	handleCategoryChange: (value: string) => void;
	handleLanguageChange: (value: string) => void;
	handleItemsPerPageChange: (value: string) => void;
	handleReset: () => void;
	hasFilters: boolean;
}

export function useWorkListFilters(): WorkListFilters & WorkListFiltersActions {
	const router = useRouter();
	const searchParams = useSearchParams();

	const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
	const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
	const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "all");
	const [languageFilter, setLanguageFilter] = useState(searchParams.get("language") || "all");
	const [itemsPerPageValue, setItemsPerPageValue] = useState(searchParams.get("limit") || "12");

	// フィルタが適用されているかどうかを判定
	const hasFilters = useMemo(() => {
		const search = searchParams.get("search");
		const category = searchParams.get("category");
		const language = searchParams.get("language");
		const excludeR18 = searchParams.get("excludeR18");

		return !!(
			search ||
			(category && category !== "all") ||
			(language && language !== "all") ||
			excludeR18
		);
	}, [searchParams]);

	// URLパラメータ更新用ユーティリティ
	const updateUrlParam = useMemo(
		() => (key: string, value: string, defaultValue: string) => {
			const params = new URLSearchParams(searchParams.toString());

			if (value && value !== defaultValue) {
				params.set(key, value);
			} else {
				params.delete(key);
			}

			params.delete("page"); // ページ番号をリセット
			router.push(`/works?${params.toString()}`);
		},
		[searchParams, router],
	);

	const handleSearch = () => {
		if (searchQuery.trim()) {
			updateUrlParam("search", searchQuery.trim(), "");
		} else {
			// 検索クエリが空の場合はパラメータを削除
			updateUrlParam("search", "", "");
		}
	};

	const handleSortChange = (value: string) => {
		setSortBy(value);
		updateUrlParam("sort", value, "newest");
	};

	const handleCategoryChange = (value: string) => {
		setCategoryFilter(value);
		updateUrlParam("category", value, "all");
	};

	const handleLanguageChange = (value: string) => {
		setLanguageFilter(value);
		updateUrlParam("language", value, "all");
	};

	const handleItemsPerPageChange = (value: string) => {
		setItemsPerPageValue(value);
		updateUrlParam("limit", value, "12");
	};

	const handleReset = () => {
		setSearchQuery("");
		setCategoryFilter("all");
		setLanguageFilter("all");
		setSortBy("newest");
		setItemsPerPageValue("12");
		// R18フィルターリセットは外部（useR18Filter）で管理されるため、ここではURL系パラメータのみリセット
		const params = new URLSearchParams();
		router.push(`/works?${params.toString()}`);
	};

	return {
		// State
		searchQuery,
		sortBy,
		categoryFilter,
		languageFilter,
		itemsPerPageValue,
		hasFilters,
		// Actions
		setSearchQuery,
		setSortBy,
		setCategoryFilter,
		setLanguageFilter,
		setItemsPerPageValue,
		handleSearch,
		handleSortChange,
		handleCategoryChange,
		handleLanguageChange,
		handleItemsPerPageChange,
		handleReset,
	};
}
