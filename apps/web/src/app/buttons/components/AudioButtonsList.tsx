"use client";

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import {
	AdvancedFilterPanel,
	type AdvancedFilters,
} from "@suzumina.click/ui/components/custom/advanced-filter-panel";
import { ListDisplayControls } from "@suzumina.click/ui/components/custom/list-display-controls";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Plus, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useState } from "react";
import { AudioButtonWithPlayCount } from "@/components/AudioButtonWithPlayCount";
import Pagination from "@/components/Pagination";

interface SearchParams {
	q?: string;
	tags?: string;
	sort?: string;
	page?: string;
	sourceVideoId?: string;
	// 高度フィルタパラメータ
	playCountMin?: string;
	playCountMax?: string;
	likeCountMin?: string;
	likeCountMax?: string;
	favoriteCountMin?: string;
	favoriteCountMax?: string;
	durationMin?: string;
	durationMax?: string;
	createdAfter?: string;
	createdBefore?: string;
	createdBy?: string;
}

interface AudioButtonsListProps {
	searchParams: SearchParams;
}

// Helper function to add parameter if it exists
const addParamIfExists = (params: URLSearchParams, key: string, value?: string) => {
	if (value) {
		params.set(key, value);
	}
};

// Helper function to add basic search parameters
const addBasicParams = (params: URLSearchParams, searchParams: SearchParams) => {
	addParamIfExists(params, "q", searchParams.q);
	addParamIfExists(params, "tags", searchParams.tags);
	addParamIfExists(params, "sort", searchParams.sort);
	addParamIfExists(params, "sourceVideoId", searchParams.sourceVideoId);
};

// Helper function to add numeric range parameters
const addNumericRangeParams = (params: URLSearchParams, searchParams: SearchParams) => {
	addParamIfExists(params, "playCountMin", searchParams.playCountMin);
	addParamIfExists(params, "playCountMax", searchParams.playCountMax);
	addParamIfExists(params, "likeCountMin", searchParams.likeCountMin);
	addParamIfExists(params, "likeCountMax", searchParams.likeCountMax);
	addParamIfExists(params, "favoriteCountMin", searchParams.favoriteCountMin);
	addParamIfExists(params, "favoriteCountMax", searchParams.favoriteCountMax);
	addParamIfExists(params, "durationMin", searchParams.durationMin);
	addParamIfExists(params, "durationMax", searchParams.durationMax);
};

// Helper function to add date and user parameters
const addDateAndUserParams = (params: URLSearchParams, searchParams: SearchParams) => {
	addParamIfExists(params, "createdAfter", searchParams.createdAfter);
	addParamIfExists(params, "createdBefore", searchParams.createdBefore);
	addParamIfExists(params, "createdBy", searchParams.createdBy);
};

// Helper function to parse numeric range from search params
const parseNumericRange = (minParam?: string, maxParam?: string) => ({
	min: minParam ? Number(minParam) : undefined,
	max: maxParam ? Number(maxParam) : undefined,
});

// Helper function to parse date range from search params
const parseDateRange = (fromParam?: string, toParam?: string) => ({
	from: fromParam ? new Date(fromParam) : undefined,
	to: toParam ? new Date(toParam) : undefined,
});

// Helper function to initialize advanced filters from search params
const createAdvancedFiltersFromParams = (params: SearchParams): AdvancedFilters => ({
	playCount: parseNumericRange(params.playCountMin, params.playCountMax),
	likeCount: parseNumericRange(params.likeCountMin, params.likeCountMax),
	favoriteCount: parseNumericRange(params.favoriteCountMin, params.favoriteCountMax),
	duration: parseNumericRange(params.durationMin, params.durationMax),
	createdAt: parseDateRange(params.createdAfter, params.createdBefore),
	createdBy: params.createdBy || undefined,
});

// Helper function to convert advanced filters to URL params
const convertFiltersToParams = (filters: AdvancedFilters): Record<string, string | undefined> => ({
	playCountMin: filters.playCount?.min?.toString(),
	playCountMax: filters.playCount?.max?.toString(),
	likeCountMin: filters.likeCount?.min?.toString(),
	likeCountMax: filters.likeCount?.max?.toString(),
	favoriteCountMin: filters.favoriteCount?.min?.toString(),
	favoriteCountMax: filters.favoriteCount?.max?.toString(),
	durationMin: filters.duration?.min?.toString(),
	durationMax: filters.duration?.max?.toString(),
	createdAfter: filters.createdAt?.from?.toISOString(),
	createdBefore: filters.createdAt?.to?.toISOString(),
	createdBy: filters.createdBy,
});

export default function AudioButtonsList({ searchParams }: AudioButtonsListProps) {
	const router = useRouter();
	const urlSearchParams = useSearchParams();
	const [audioButtons, setAudioButtons] = useState<FrontendAudioButtonData[]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// フォームの状態
	const [searchQuery, setSearchQuery] = useState(searchParams.q || "");
	const [sortBy, setSortBy] = useState(searchParams.sort || "default");
	const [itemsPerPageValue, setItemsPerPageValue] = useState("12");

	// 高度フィルタの状態
	const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(() =>
		createAdvancedFiltersFromParams(searchParams),
	);

	const currentPage = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;
	const itemsPerPageNum = Number.parseInt(itemsPerPageValue, 10);
	const totalPages = Math.ceil(totalCount / itemsPerPageNum);

	// URLパラメータからクエリパラメータを構築
	const buildQueryParams = useCallback((): URLSearchParams => {
		const queryParams = new URLSearchParams();
		queryParams.set("limit", itemsPerPageNum.toString());

		addBasicParams(queryParams, searchParams);
		addNumericRangeParams(queryParams, searchParams);
		addDateAndUserParams(queryParams, searchParams);

		return queryParams;
	}, [searchParams, itemsPerPageNum]);

	// APIレスポンスの処理
	const handleApiResponse = useCallback(
		(result: {
			success: boolean;
			data?: { audioButtons?: FrontendAudioButtonData[] };
			error?: string;
		}) => {
			if (!result) {
				setError("データの取得に失敗しました");
				return;
			}

			if (result.success && result.data) {
				setAudioButtons(result.data.audioButtons || []);
				setTotalCount(result.data.audioButtons?.length || 0);
			} else {
				setError(result.error || "エラーが発生しました");
			}
		},
		[],
	);

	// データ取得
	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			setError(null);

			try {
				const queryParams = buildQueryParams();
				const response = await fetch(`/api/audio-buttons?${queryParams.toString()}`);
				const result = await response.json();
				handleApiResponse(result);
			} catch (_err) {
				setError("データの取得に失敗しました");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [buildQueryParams, handleApiResponse]);

	// URLパラメータを更新
	const updateSearchParams = (params: Record<string, string | undefined>) => {
		const newParams = new URLSearchParams(urlSearchParams.toString());

		Object.entries(params).forEach(([key, value]) => {
			if (value) {
				newParams.set(key, value);
			} else {
				newParams.delete(key);
			}
		});

		// ページ番号をリセット
		if (!params.page) {
			newParams.delete("page");
		}

		router.push(`/buttons?${newParams.toString()}`);
	};

	const handleSearch = () => {
		startTransition(() => {
			updateSearchParams({ q: searchQuery || undefined });
		});
	};

	const handleSortChange = (value: string) => {
		setSortBy(value);
		startTransition(() => {
			updateSearchParams({ sort: value === "default" ? undefined : value });
		});
	};

	// カテゴリー機能は削除（タグベースシステムに移行）

	// 検索・フィルターリセット
	const handleReset = () => {
		setSearchQuery("");
		startTransition(() => {
			updateSearchParams({ q: undefined, tags: undefined });
		});
	};

	// 件数/ページ変更
	const handleItemsPerPageChange = (value: string) => {
		startTransition(() => {
			setItemsPerPageValue(value);
		});
	};

	// 高度フィルタ変更ハンドラー
	const handleAdvancedFiltersChange = (filters: AdvancedFilters) => {
		setAdvancedFilters(filters);
	};

	// 高度フィルタ適用ハンドラー
	const handleApplyAdvancedFilters = () => {
		startTransition(() => {
			updateSearchParams(convertFiltersToParams(advancedFilters));
		});
	};

	if (loading) {
		return (
			<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-12">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-suzuka-500" />
					<p className="mt-2 text-muted-foreground">読み込み中...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-rose-100 p-12">
				<div className="text-center">
					<Sparkles className="mx-auto h-16 w-16 text-rose-400 mb-4" />
					<h3 className="text-xl font-semibold text-foreground mb-2">エラーが発生しました</h3>
					<p className="text-muted-foreground">{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* 1. 検索・フィルターエリア */}
			<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-6">
				<div className="space-y-4">
					{/* 検索バー */}
					<div className="flex flex-col sm:flex-row gap-4">
						<div className="flex-1">
							<div className="relative">
								<input
									type="text"
									placeholder="音声ボタンを検索..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleSearch()}
									className="w-full h-12 px-4 pr-12 rounded-lg border border-suzuka-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-suzuka-400 focus:border-transparent placeholder:text-muted-foreground"
								/>
								<button
									type="button"
									onClick={handleSearch}
									className="absolute right-3 top-1/2 transform -translate-y-1/2 text-suzuka-500 hover:text-suzuka-600 p-1"
									aria-label="検索"
								>
									<Search className="h-5 w-5" />
								</button>
							</div>
						</div>

						{/* アクションボタン */}
						<div className="flex gap-2">
							<Button
								onClick={handleSearch}
								className="h-12 px-8 bg-suzuka-500 hover:bg-suzuka-600 text-white border-0"
							>
								検索
							</Button>
							{searchQuery && (
								<Button
									variant="outline"
									onClick={handleReset}
									className="h-12 px-4 border-suzuka-200 text-suzuka-600 hover:bg-suzuka-50"
									aria-label="検索をリセット"
								>
									<X className="h-4 w-4" />
								</Button>
							)}
						</div>
					</div>

					{/* 人気タグ */}
					<div className="space-y-2">
						<p className="text-sm font-medium text-muted-foreground">人気タグ</p>
						<div className="flex flex-wrap gap-2">
							{["挨拶", "応援", "おやすみ", "ありがとう", "お疲れ様"].map((tag) => (
								<button
									key={tag}
									type="button"
									onClick={() => {
										setSearchQuery(tag);
										startTransition(() => {
											updateSearchParams({ q: tag });
										});
									}}
									className="px-3 py-1.5 text-sm rounded-full bg-suzuka-100 text-suzuka-700 hover:bg-suzuka-200 transition-colors"
								>
									{tag}
								</button>
							))}
						</div>
					</div>

					{/* 高度フィルタ */}
					<AdvancedFilterPanel
						filters={advancedFilters}
						onChange={handleAdvancedFiltersChange}
						onApply={handleApplyAdvancedFilters}
					/>
				</div>
			</div>

			{/* 2. リスト表示制御 */}
			<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-6">
				<ListDisplayControls
					title={searchParams.sourceVideoId ? "この動画の音声ボタン" : "音声ボタン一覧"}
					totalCount={totalCount}
					currentPage={currentPage}
					totalPages={totalPages}
					sortValue={sortBy}
					onSortChange={handleSortChange}
					sortOptions={[
						{ value: "default", label: "並び順" },
						{ value: "newest", label: "新しい順" },
						{ value: "oldest", label: "古い順" },
						{ value: "popular", label: "人気順" },
						{ value: "mostPlayed", label: "再生回数順" },
					]}
					itemsPerPageValue={itemsPerPageValue}
					onItemsPerPageChange={handleItemsPerPageChange}
					actions={
						searchParams.sourceVideoId ? (
							<Link
								href={`/videos/${searchParams.sourceVideoId}`}
								className="text-sm text-suzuka-600 hover:text-suzuka-700 font-medium"
							>
								← 動画詳細に戻る
							</Link>
						) : undefined
					}
				/>
			</div>

			{/* 音声ボタン一覧 */}
			{audioButtons.length === 0 ? (
				<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-12">
					<div className="text-center">
						<Sparkles className="mx-auto h-16 w-16 text-suzuka-400 mb-4" />
						<h3 className="text-xl font-semibold text-foreground mb-2">
							音声ボタンが見つかりませんでした
						</h3>
						<p className="text-muted-foreground mb-6">
							検索条件を変更するか、新しい音声ボタンを作成してみましょう
						</p>
						<Button asChild className="bg-suzuka-500 hover:bg-suzuka-600 text-white">
							<Link href="/buttons/create">
								<Plus className="h-4 w-4 mr-2" />
								音声ボタンを作成
							</Link>
						</Button>
					</div>
				</div>
			) : (
				<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-6">
					<div className="flex flex-wrap gap-3 items-start">
						{audioButtons.map((audioButton) => (
							<AudioButtonWithPlayCount
								key={audioButton.id}
								audioButton={audioButton}
								className="shadow-sm hover:shadow-md transition-all duration-200"
								searchQuery={searchParams.q}
								highlightClassName="bg-suzuka-200 text-suzuka-900 px-0.5 rounded"
							/>
						))}
					</div>
				</div>
			)}

			{/* 3. ページネーション */}
			{totalPages > 1 && (
				<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-6">
					<Pagination currentPage={currentPage} totalPages={totalPages} />
				</div>
			)}

			{/* 統計情報 */}
			{audioButtons.length > 0 && (
				<div className="text-center">
					<div className="inline-block bg-white/60 backdrop-blur-sm rounded-full px-6 py-2 text-sm text-muted-foreground border border-suzuka-100">
						{totalCount.toLocaleString()}件中{" "}
						{((currentPage - 1) * itemsPerPageNum + 1).toLocaleString()}〜
						{Math.min(currentPage * itemsPerPageNum, totalCount).toLocaleString()}件を表示
					</div>
				</div>
			)}
		</div>
	);
}
