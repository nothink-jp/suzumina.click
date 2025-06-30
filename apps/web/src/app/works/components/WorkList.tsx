"use client";

import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import { ListDisplayControls } from "@suzumina.click/ui/components/custom/list-display-controls";
import {
	ListPageEmptyState,
	ListPageGrid,
	ListPageStats,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { SearchAndFilterPanel } from "@suzumina.click/ui/components/custom/search-and-filter-panel";
import { FilterSelect } from "@suzumina.click/ui/components/custom/search-filter-panel";
import { FileText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import Pagination from "@/components/Pagination";
import WorkCard from "./WorkCard";

interface WorkListProps {
	data: FrontendDLsiteWorkData[];
	totalCount: number;
	currentPage: number;
}

export default function WorkList({ data, totalCount, currentPage }: WorkListProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
	const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
	const [categoryFilter, setCategoryFilter] = useState("all");
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
			router.push(`/works?${params.toString()}`);
		},
		[searchParams, router],
	);

	const itemsPerPageNum = Number.parseInt(itemsPerPageValue, 10);
	const totalPages = Math.ceil(totalCount / itemsPerPageNum);

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

	const handleSortChange = (value: string) => {
		setSortBy(value);
		updateUrlParam("sort", value, "newest");
	};

	const handleCategoryChange = (value: string) => {
		setCategoryFilter(value);
		updateUrlParam("category", value, "all");
	};

	// 検索・フィルターリセット
	const handleReset = () => {
		setSearchQuery("");
		setCategoryFilter("all");
		setSortBy("newest");
		setItemsPerPageValue("12");
		const params = new URLSearchParams();
		router.push(`/works?${params.toString()}`);
	};

	// 件数/ページ変更
	const handleItemsPerPageChange = (value: string) => {
		setItemsPerPageValue(value);
		updateUrlParam("limit", value, "12");
	};

	return (
		<div>
			{/* 1. 検索・フィルターエリア */}
			<SearchAndFilterPanel
				searchValue={searchQuery}
				onSearchChange={setSearchQuery}
				onSearch={handleSearch}
				onReset={handleReset}
				searchPlaceholder="作品タイトルで検索..."
				hasActiveFilters={searchQuery !== "" || categoryFilter !== "all"}
				onSearchKeyDown={(e) => {
					if (e.key === "Enter") {
						handleSearch();
					}
				}}
				filters={
					<FilterSelect
						value={categoryFilter}
						onValueChange={handleCategoryChange}
						placeholder="カテゴリ"
						options={[
							{ value: "all", label: "すべてのカテゴリ" },
							{ value: "SOU", label: "ボイス・ASMR" },
							{ value: "ADV", label: "アドベンチャー" },
							{ value: "RPG", label: "ロールプレイング" },
							{ value: "MOV", label: "動画" },
						]}
					/>
				}
			/>

			{/* 2. リスト表示制御 */}
			<ListDisplayControls
				title="作品一覧"
				totalCount={totalCount}
				currentPage={currentPage}
				totalPages={totalPages}
				sortValue={sortBy}
				onSortChange={handleSortChange}
				sortOptions={[
					{ value: "newest", label: "新しい順" },
					{ value: "oldest", label: "古い順" },
					{ value: "popular", label: "人気順" },
					{ value: "rating", label: "評価順" },
					{ value: "price_low", label: "価格安い順" },
					{ value: "price_high", label: "価格高い順" },
				]}
				itemsPerPageValue={itemsPerPageValue}
				onItemsPerPageChange={handleItemsPerPageChange}
			/>

			{/* 作品一覧 */}
			{data.length === 0 ? (
				<ListPageEmptyState
					icon={<FileText className="mx-auto h-12 w-12" />}
					title="作品が見つかりませんでした"
					description="検索条件を変更してお試しください"
				/>
			) : (
				<ListPageGrid
					columns={{
						default: 1,
						md: 2,
						lg: 3,
						xl: 4,
					}}
				>
					{data.map((work, index) => (
						<div key={work.id} className="min-h-card">
							<WorkCard
								work={work}
								variant="default"
								priority={index < 8} // 最初の8枚をLCP最適化
							/>
						</div>
					))}
				</ListPageGrid>
			)}

			{/* 3. ページネーション */}
			{totalPages > 1 && (
				<div className="mt-8">
					<Pagination currentPage={currentPage} totalPages={totalPages} />
				</div>
			)}

			{/* 統計情報 */}
			{data.length > 0 && (
				<ListPageStats
					currentPage={currentPage}
					totalPages={totalPages}
					totalCount={totalCount}
					itemsPerPage={itemsPerPageNum}
				/>
			)}
		</div>
	);
}
