"use client";

import { AdvancedFilterPanel } from "@suzumina.click/ui/components/custom/advanced-filter-panel";
import { ListDisplayControls } from "@suzumina.click/ui/components/custom/list-display-controls";
import Link from "next/link";
import { startTransition } from "react";
import Pagination from "@/components/ui/pagination";
import { AudioButtonsEmptyState } from "./AudioButtonsEmptyState";
import { AudioButtonsErrorState } from "./AudioButtonsErrorState";
import { AudioButtonsGrid } from "./AudioButtonsGrid";
import { AudioButtonsLoadingState } from "./AudioButtonsLoadingState";
import { AudioButtonsSearchBar } from "./AudioButtonsSearchBar";
import { AudioButtonsStats } from "./AudioButtonsStats";
import type { SearchParams } from "./audio-buttons-list-helpers";
import { useAudioButtonsList } from "./useAudioButtonsList";

interface AudioButtonsListProps {
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

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";

export default function AudioButtonsList({ searchParams, initialData }: AudioButtonsListProps) {
	const {
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
		applyAdvancedFilters,
	} = useAudioButtonsList({ searchParams, initialData });

	// イベントハンドラー

	const handleSearch = () => updateSearchParams({ q: searchQuery || undefined });
	const handleReset = () => {
		setSearchQuery("");
		updateSearchParams({ q: undefined, tags: undefined });
	};
	const handleSortChange = (value: string) => {
		setSortBy(value);
		startTransition(() => {
			updateSearchParams({ sort: value === "default" ? undefined : value });
		});
	};
	const handleItemsPerPageChange = (value: string) => {
		startTransition(() => {
			setItemsPerPageValue(value);
			updateSearchParams({ page: undefined, limit: value === "12" ? undefined : value });
		});
	};

	// ローディング状態
	if (loading) return <AudioButtonsLoadingState />;

	// エラー状態
	if (error) return <AudioButtonsErrorState error={error} />;

	return (
		<div className="space-y-6">
			{/* 1. 検索・フィルターエリア */}
			<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-6">
				<div className="space-y-4">
					<AudioButtonsSearchBar
						searchQuery={searchQuery}
						onSearchQueryChange={setSearchQuery}
						onSearch={handleSearch}
						onReset={handleReset}
					/>

					{/* 高度フィルタ */}
					<AdvancedFilterPanel
						filters={advancedFilters}
						onChange={setAdvancedFilters}
						onApply={applyAdvancedFilters}
					/>
				</div>
			</div>

			{/* 2. リスト表示制御 */}
			<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-6">
				<ListDisplayControls
					title={searchParams.sourceVideoId ? "この動画の音声ボタン" : "音声ボタン一覧"}
					totalCount={totalCount}
					filteredCount={isFiltered ? filteredCount : undefined}
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
				<AudioButtonsEmptyState />
			) : (
				<AudioButtonsGrid audioButtons={audioButtons} searchQuery={searchParams.q} />
			)}

			{/* 3. ページネーション */}
			{totalPages > 1 && (
				<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-6">
					<Pagination currentPage={currentPage} totalPages={totalPages} />
				</div>
			)}

			{/* 統計情報 */}
			{audioButtons.length > 0 && (
				<AudioButtonsStats
					effectiveCount={effectiveCount}
					currentPage={currentPage}
					itemsPerPage={Number.parseInt(itemsPerPageValue, 10)}
				/>
			)}
		</div>
	);
}
