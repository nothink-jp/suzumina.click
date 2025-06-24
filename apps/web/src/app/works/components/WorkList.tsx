"use client";

import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import { ListHeader } from "@suzumina.click/ui/components/custom/list-header";
import {
	ListPageEmptyState,
	ListPageGrid,
	ListPageStats,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import {
	FilterSelect,
	SearchFilterPanel,
	SortSelect,
} from "@suzumina.click/ui/components/custom/search-filter-panel";
import { FileText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState } from "react";
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
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("");

	const itemsPerPage = 12;
	const totalPages = Math.ceil(totalCount / itemsPerPage);

	// URLパラメータを更新
	const updateSearchParams = (params: Record<string, string | undefined>) => {
		const newParams = new URLSearchParams(searchParams.toString());

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

		router.push(`/works?${newParams.toString()}`);
	};

	const handleSearch = () => {
		if (searchQuery.trim()) {
			startTransition(() => {
				updateSearchParams({ q: searchQuery });
			});
		}
	};

	const handleSortChange = (value: string) => {
		setSortBy(value);
		startTransition(() => {
			updateSearchParams({ sort: value || undefined });
		});
	};

	const handleCategoryChange = (value: string) => {
		setCategoryFilter(value);
		startTransition(() => {
			updateSearchParams({ category: value || undefined });
		});
	};

	return (
		<div>
			{/* 検索・フィルター */}
			<SearchFilterPanel
				searchValue={searchQuery}
				onSearchChange={setSearchQuery}
				onSearch={handleSearch}
				searchPlaceholder="作品タイトルで検索..."
				filters={
					<>
						<SortSelect
							value={sortBy}
							onValueChange={handleSortChange}
							options={[
								{ value: "", label: "並び順" },
								{ value: "newest", label: "新しい順" },
								{ value: "oldest", label: "古い順" },
								{ value: "popular", label: "人気順" },
								{ value: "rating", label: "評価順" },
								{ value: "price_low", label: "価格安い順" },
								{ value: "price_high", label: "価格高い順" },
							]}
						/>
						<FilterSelect
							value={categoryFilter}
							onValueChange={handleCategoryChange}
							placeholder="カテゴリ"
							options={[
								{ value: "", label: "すべてのカテゴリ" },
								{ value: "SOU", label: "ボイス・ASMR" },
								{ value: "ADV", label: "アドベンチャー" },
								{ value: "RPG", label: "ロールプレイング" },
								{ value: "MOV", label: "動画" },
							]}
						/>
					</>
				}
			/>

			{/* ヘッダー */}
			<ListHeader
				title="作品一覧"
				totalCount={totalCount}
				currentPage={currentPage}
				totalPages={totalPages}
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

			{/* ページネーション */}
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
					itemsPerPage={itemsPerPage}
				/>
			)}
		</div>
	);
}
