"use client";

import type { VideoListResult } from "@suzumina.click/shared-types/src/video";
import { ListDisplayControls } from "@suzumina.click/ui/components/custom/list-display-controls";
import {
	ListPageEmptyState,
	ListPageGrid,
	ListPageStats,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { SearchAndFilterPanel } from "@suzumina.click/ui/components/custom/search-and-filter-panel";
import { FilterSelect } from "@suzumina.click/ui/components/custom/search-filter-panel";
import { PlayCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import Pagination from "@/components/ui/pagination";
import VideoCard from "./VideoCard";

interface VideoListProps {
	data: VideoListResult;
	totalCount: number;
	filteredCount?: number;
	currentPage: number;
}

export default function VideoList({
	data,
	totalCount,
	filteredCount,
	currentPage,
}: VideoListProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
	const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
	const [yearFilter, setYearFilter] = useState(searchParams.get("year") || "all");
	const [categoryFilter, setCategoryFilter] = useState(searchParams.get("categoryNames") || "all");
	const [itemsPerPageValue, setItemsPerPageValue] = useState(searchParams.get("limit") || "12");

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
			router.push(`/videos?${params.toString()}`);
		},
		[searchParams, router],
	);

	const itemsPerPageNum = Number.parseInt(itemsPerPageValue, 10);
	// 検索結果がある場合は実際の結果数を使用、それ以外はフィルタリング結果を使用
	const displayCount = searchQuery
		? data.videos.length
		: filteredCount !== undefined
			? filteredCount
			: totalCount;
	const totalPages = Math.ceil(displayCount / itemsPerPageNum);

	// 年代選択肢を動的に生成（2018年から現在年まで）
	const currentYear = new Date().getFullYear();
	const yearOptions = useMemo(() => {
		const years = [];
		for (let year = currentYear; year >= 2018; year--) {
			years.push(year);
		}
		return years;
	}, [currentYear]);

	// カテゴリー選択肢の定義
	const categoryOptions = useMemo(() => [
		{ value: "all", label: "すべてのカテゴリ" },
		{ value: "音楽", label: "音楽" },
		{ value: "ゲーム", label: "ゲーム" },
		{ value: "エンターテインメント", label: "エンターテインメント" },
		{ value: "ブログ・人物", label: "ブログ・人物" },
		{ value: "コメディー", label: "コメディー" },
		{ value: "教育", label: "教育" },
		{ value: "科学技術", label: "科学技術" },
		{ value: "ニュース・政治", label: "ニュース・政治" },
		{ value: "ハウツー・スタイル", label: "ハウツー・スタイル" },
		{ value: "旅行・イベント", label: "旅行・イベント" },
		{ value: "スポーツ", label: "スポーツ" },
		{ value: "ペット・動物", label: "ペット・動物" },
		{ value: "自動車・乗り物", label: "自動車・乗り物" },
		{ value: "映画・アニメ", label: "映画・アニメ" },
		{ value: "非営利団体・社会活動", label: "非営利団体・社会活動" },
	], []);

	// 年代フィルターの変更をURLに反映
	const handleYearChange = (year: string) => {
		setYearFilter(year);
		updateUrlParam("year", year, "all");
	};

	// カテゴリーフィルターの変更をURLに反映
	const handleCategoryChange = (category: string) => {
		setCategoryFilter(category);
		updateUrlParam("categoryNames", category, "all");
	};

	// FID改善: startTransition で非緊急更新を遅延
	const handleSearch = () => {
		if (searchQuery.trim()) {
			startTransition(() => {
				updateUrlParam("search", searchQuery.trim(), "");
			});
		} else {
			// 検索クエリが空の場合はパラメータを削除
			updateUrlParam("search", "", "");
		}
	};

	// 検索・フィルターリセット
	const handleReset = () => {
		setSearchQuery("");
		setYearFilter("all");
		setCategoryFilter("all");
		setSortBy("newest");
		setItemsPerPageValue("12");
		const params = new URLSearchParams();
		router.push(`/videos?${params.toString()}`);
	};

	// 並び順変更
	const handleSortChange = (value: string) => {
		setSortBy(value);
		updateUrlParam("sort", value, "newest");
	};

	// 件数/ページ変更
	const handleItemsPerPageChange = (value: string) => {
		setItemsPerPageValue(value);
		updateUrlParam("limit", value, "12");
	};

	// FID改善: 検索・フィルタリング結果をメモ化
	const filteredVideos = useMemo(() => {
		// 現在は全て表示、将来的にフィルタリングロジックを追加
		return data.videos;
	}, [data.videos]);

	return (
		<div>
			{/* 1. 検索・フィルターエリア */}
			<SearchAndFilterPanel
				searchValue={searchQuery}
				onSearchChange={setSearchQuery}
				onSearch={handleSearch}
				onReset={handleReset}
				searchPlaceholder="動画タイトルで検索..."
				hasActiveFilters={searchQuery !== "" || yearFilter !== "all" || categoryFilter !== "all" || sortBy !== "newest"}
				onSearchKeyDown={(e) => {
					if (e.key === "Enter") {
						handleSearch();
					}
				}}
				filters={
					<>
						<FilterSelect
							value={yearFilter}
							onValueChange={handleYearChange}
							placeholder="すべての年代"
							options={[
								{ value: "all", label: "すべての年代" },
								...yearOptions.map((year) => ({
									value: year.toString(),
									label: `${year}年`,
								})),
							]}
						/>
						<FilterSelect
							value={categoryFilter}
							onValueChange={handleCategoryChange}
							placeholder="すべてのカテゴリ"
							options={categoryOptions}
						/>
					</>
				}
			/>

			{/* 2. リスト表示制御 */}
			<ListDisplayControls
				title="動画一覧"
				totalCount={totalCount}
				filteredCount={searchQuery || yearFilter !== "all" || categoryFilter !== "all" ? displayCount : undefined}
				currentPage={currentPage}
				totalPages={totalPages}
				sortValue={sortBy}
				onSortChange={handleSortChange}
				sortOptions={[
					{ value: "newest", label: "新しい順" },
					{ value: "oldest", label: "古い順" },
				]}
				itemsPerPageValue={itemsPerPageValue}
				onItemsPerPageChange={handleItemsPerPageChange}
			/>

			{/* 動画一覧 */}
			{filteredVideos.length === 0 ? (
				<ListPageEmptyState
					icon={<PlayCircle className="mx-auto h-12 w-12" />}
					title="動画が見つかりませんでした"
				/>
			) : (
				<ListPageGrid>
					{filteredVideos.map((video, index) => (
						<div key={video.id} className="min-h-video-card">
							<VideoCard
								video={video}
								variant="grid"
								priority={index < 6} // 最初の6枚をLCP最適化
							/>
						</div>
					))}
				</ListPageGrid>
			)}

			{/* 3. ページネーション */}
			{totalPages > 1 && data.videos.length > 0 && (
				<div className="mt-8">
					<Pagination currentPage={currentPage} totalPages={totalPages} />
				</div>
			)}

			{/* 統計情報 */}
			{data.videos.length > 0 && (
				<ListPageStats
					currentPage={currentPage}
					totalPages={totalPages}
					totalCount={displayCount}
					itemsPerPage={itemsPerPageNum}
				/>
			)}
		</div>
	);
}
