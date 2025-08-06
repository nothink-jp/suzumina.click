"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import type { AdvancedFilters } from "@suzumina.click/ui/components/custom/advanced-filter-panel";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioButtonsList } from "@/app/buttons/actions";
import {
	AudioButtonQueryBuilder,
	convertFiltersToParams,
	createAdvancedFiltersFromParams,
	hasFilters,
	type SearchParams,
} from "./audio-buttons-list-helpers";

interface UseAudioButtonsListProps {
	searchParams: SearchParams;
	initialData?:
		| {
				success: true;
				data: {
					audioButtons: AudioButtonPlainObject[];
					totalCount: number;
					hasMore: boolean;
				};
		  }
		| {
				success: false;
				error: string;
		  };
}

export function useAudioButtonsList({ searchParams, initialData }: UseAudioButtonsListProps) {
	const router = useRouter();
	const urlSearchParams = useSearchParams();

	// 状態管理
	const [audioButtons, setAudioButtons] = useState<AudioButtonPlainObject[]>(
		initialData?.success ? initialData.data.audioButtons : [],
	);
	const [totalCount, setTotalCount] = useState(
		initialData?.success ? initialData.data.totalCount : 0,
	);
	const [filteredCount, setFilteredCount] = useState<number | undefined>(undefined);
	const [loading, setLoading] = useState(!initialData);
	const [error, setError] = useState<string | null>(
		initialData && !initialData.success ? initialData.error : null,
	);

	// フォームの状態
	const [searchQuery, setSearchQuery] = useState(searchParams.q || "");
	const [sortBy, setSortBy] = useState(searchParams.sort || "default");
	const [itemsPerPageValue, setItemsPerPageValue] = useState(searchParams.limit || "12");
	const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(() =>
		createAdvancedFiltersFromParams(searchParams),
	);

	// デバウンス用のタイマー管理
	const navigationTimerRef = useRef<NodeJS.Timeout | null>(null);

	// ページネーション計算
	const currentPage = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;
	const itemsPerPageNum = Number.parseInt(itemsPerPageValue, 10);
	const isFiltered = hasFilters(searchParams);
	const effectiveCount = isFiltered && filteredCount !== undefined ? filteredCount : totalCount;
	const totalPages = Math.ceil(effectiveCount / itemsPerPageNum);

	// URLパラメータからAudioButtonQueryを構築
	const buildAudioButtonQuery = useCallback(() => {
		const builder = new AudioButtonQueryBuilder(itemsPerPageNum, currentPage);
		return builder
			.addBasicSearchParams(searchParams)
			.addPlayAndLikeParams(searchParams)
			.addFavoriteParams(searchParams)
			.addDateAndUserParams(searchParams)
			.build();
	}, [searchParams, itemsPerPageNum, currentPage]);

	// APIレスポンスの処理
	const handleApiResponse = useCallback(
		(result: {
			success: boolean;
			data?: {
				audioButtons?: AudioButtonPlainObject[];
				totalCount?: number;
				filteredCount?: number;
			};
			error?: string;
		}) => {
			if (!result) {
				setError("データの取得に失敗しました");
				return;
			}

			if (result.success && result.data) {
				setAudioButtons(result.data.audioButtons || []);
				setTotalCount(result.data.totalCount || 0);
				setFilteredCount(result.data.filteredCount);
			} else {
				setError(result.error || "エラーが発生しました");
			}
		},
		[],
	);

	// データ取得
	useEffect(() => {
		const isInitialLoad = !urlSearchParams.toString() && initialData?.success;
		if (isInitialLoad) return;

		const fetchData = async () => {
			setLoading(true);
			setError(null);

			try {
				const query = buildAudioButtonQuery();
				const result = await getAudioButtonsList(query);
				handleApiResponse(result);
			} catch (_err) {
				setError("データの取得に失敗しました");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [buildAudioButtonQuery, handleApiResponse, urlSearchParams, initialData]);

	// URLパラメータを更新（デバウンス機能付き）
	const updateSearchParams = useCallback(
		(params: Record<string, string | undefined>) => {
			if (navigationTimerRef.current) {
				clearTimeout(navigationTimerRef.current);
			}

			navigationTimerRef.current = setTimeout(() => {
				const newParams = new URLSearchParams(urlSearchParams.toString());

				Object.entries(params).forEach(([key, value]) => {
					if (value) {
						newParams.set(key, value);
					} else {
						newParams.delete(key);
					}
				});

				if (!params.page) {
					newParams.delete("page");
				}

				router.push(`/buttons?${newParams.toString()}`);
			}, 300);
		},
		[urlSearchParams, router],
	);

	// クリーンアップ
	useEffect(() => {
		return () => {
			if (navigationTimerRef.current) {
				clearTimeout(navigationTimerRef.current);
			}
		};
	}, []);

	return {
		// 状態
		audioButtons,
		totalCount,
		filteredCount,
		loading,
		error,
		searchQuery,
		sortBy,
		itemsPerPageValue,
		advancedFilters,
		currentPage,
		totalPages,
		effectiveCount,
		isFiltered,
		// 状態更新関数
		setSearchQuery,
		setSortBy,
		setItemsPerPageValue,
		setAdvancedFilters,
		// アクション
		updateSearchParams,
		applyAdvancedFilters: () => updateSearchParams(convertFiltersToParams(advancedFilters)),
	};
}
