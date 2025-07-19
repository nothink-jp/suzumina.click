"use client";

import {
	WORK_CATEGORY_DISPLAY_NAMES,
	WORK_LANGUAGE_DISPLAY_NAMES,
} from "@suzumina.click/shared-types";
import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import { ListDisplayControls } from "@suzumina.click/ui/components/custom/list-display-controls";
import {
	ListPageEmptyState,
	ListPageGrid,
	ListPageStats,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { SearchAndFilterPanel } from "@suzumina.click/ui/components/custom/search-and-filter-panel";
import { FilterSelect } from "@suzumina.click/ui/components/custom/search-filter-panel";
import { Switch } from "@suzumina.click/ui/components/ui/switch";
import { FileText, Shield } from "lucide-react";
import Pagination from "@/components/ui/pagination";
import { useR18Filter } from "@/hooks/use-r18-filter";
import { useWorkListFilters } from "@/hooks/use-work-list-filters";
import WorkCard from "./WorkCard";

interface WorkListProps {
	data: FrontendDLsiteWorkData[];
	totalCount: number;
	filteredCount?: number;
	currentPage: number;
}

export default function WorkList({ data, totalCount, filteredCount, currentPage }: WorkListProps) {
	// カスタムフックによる状態管理の分離
	const filters = useWorkListFilters();
	const r18Filter = useR18Filter();

	// 計算値
	const itemsPerPageNum = Number.parseInt(filters.itemsPerPageValue, 10);
	const totalPages = Math.ceil(
		(filters.hasFilters && filteredCount !== undefined ? filteredCount : totalCount) /
			itemsPerPageNum,
	);

	// 統合リセット関数
	const handleReset = () => {
		filters.handleReset();
		r18Filter.resetR18Filter();
	};

	return (
		<div>
			{/* 1. 検索・フィルターエリア */}
			<SearchAndFilterPanel
				searchValue={filters.searchQuery}
				onSearchChange={filters.setSearchQuery}
				onSearch={filters.handleSearch}
				onReset={handleReset}
				searchPlaceholder="作品タイトルで検索..."
				hasActiveFilters={
					filters.searchQuery !== "" ||
					(filters.categoryFilter !== "all" && filters.categoryFilter !== "") ||
					(filters.languageFilter !== "all" && filters.languageFilter !== "") ||
					(r18Filter.isAdult && !r18Filter.showR18) // 成人ユーザーがR18を除外している場合（デフォルトは表示）
				}
				onSearchKeyDown={(e) => {
					if (e.key === "Enter") {
						filters.handleSearch();
					}
				}}
				filters={
					<>
						<FilterSelect
							value={filters.categoryFilter}
							onValueChange={filters.handleCategoryChange}
							placeholder="カテゴリ"
							options={[
								{ value: "all", label: "すべてのカテゴリ" },
								{ value: "SOU", label: WORK_CATEGORY_DISPLAY_NAMES.SOU },
								{ value: "ADV", label: WORK_CATEGORY_DISPLAY_NAMES.ADV },
								{ value: "RPG", label: WORK_CATEGORY_DISPLAY_NAMES.RPG },
								{ value: "MOV", label: WORK_CATEGORY_DISPLAY_NAMES.MOV },
							]}
						/>
						<FilterSelect
							value={filters.languageFilter}
							onValueChange={filters.handleLanguageChange}
							placeholder="言語"
							options={[
								{ value: "all", label: "すべての言語" },
								{ value: "ja", label: WORK_LANGUAGE_DISPLAY_NAMES.ja },
								{ value: "en", label: WORK_LANGUAGE_DISPLAY_NAMES.en },
								{ value: "zh-cn", label: WORK_LANGUAGE_DISPLAY_NAMES["zh-cn"] },
								{ value: "zh-tw", label: WORK_LANGUAGE_DISPLAY_NAMES["zh-tw"] },
								{ value: "ko", label: WORK_LANGUAGE_DISPLAY_NAMES.ko },
								{ value: "es", label: WORK_LANGUAGE_DISPLAY_NAMES.es },
								{ value: "not-required", label: WORK_LANGUAGE_DISPLAY_NAMES["not-required"] },
								{ value: "dlsite-official", label: WORK_LANGUAGE_DISPLAY_NAMES["dlsite-official"] },
								{ value: "other", label: WORK_LANGUAGE_DISPLAY_NAMES.other },
							]}
						/>

						{/* R18レーティングフィルター */}
						{r18Filter.isAdult ? (
							<div className="flex items-center gap-3 px-3 py-2 border border-border rounded-md bg-background">
								<Shield className="h-4 w-4 text-muted-foreground" />
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium">R18作品表示</span>
									<Switch
										checked={r18Filter.showR18}
										onCheckedChange={r18Filter.handleR18Toggle}
										aria-label="R18作品の表示を切り替え"
									/>
								</div>
							</div>
						) : (
							<div className="flex items-center gap-3 px-3 py-2 border border-blue-200 rounded-md bg-blue-50">
								<Shield className="h-4 w-4 text-blue-600" />
								<span className="text-sm text-blue-700 font-medium">全年齢対象作品のみ表示中</span>
							</div>
						)}
					</>
				}
			/>

			{/* 2. リスト表示制御 */}
			<ListDisplayControls
				title="作品一覧"
				totalCount={totalCount}
				filteredCount={filters.hasFilters ? filteredCount : undefined}
				currentPage={currentPage}
				totalPages={totalPages}
				sortValue={filters.sortBy}
				onSortChange={filters.handleSortChange}
				sortOptions={[
					{ value: "newest", label: "新しい順" },
					{ value: "oldest", label: "古い順" },
					{ value: "popular", label: "人気順" },
					{ value: "price_low", label: "価格安い順" },
					{ value: "price_high", label: "価格高い順" },
				]}
				itemsPerPageValue={filters.itemsPerPageValue}
				onItemsPerPageChange={filters.handleItemsPerPageChange}
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
