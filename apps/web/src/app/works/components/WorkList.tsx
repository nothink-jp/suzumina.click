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
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import Pagination from "@/components/ui/pagination";
import { useAgeVerification } from "@/contexts/age-verification-context";
import WorkCard from "./WorkCard";

interface WorkListProps {
	data: FrontendDLsiteWorkData[];
	totalCount: number;
	filteredCount?: number;
	currentPage: number;
}

export default function WorkList({ data, totalCount, filteredCount, currentPage }: WorkListProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isAdult, isLoading: ageVerificationLoading } = useAgeVerification();
	const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
	const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
	const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "all");
	const [languageFilter, setLanguageFilter] = useState(searchParams.get("language") || "all");
	const [itemsPerPageValue, setItemsPerPageValue] = useState(searchParams.get("limit") || "12");

	// R18フィルターの状態（成人向けサイトのため、デフォルトでR18表示）
	const [showR18, setShowR18] = useState(() => {
		const excludeR18Param = searchParams.get("excludeR18");
		// URLパラメータがある場合はそれに従う
		if (excludeR18Param !== null) {
			return excludeR18Param === "false";
		}
		// URLパラメータがない場合は成人向けサイトとしてR18を表示（excludeR18=false）
		return true;
	});

	// URLパラメータが変更された時にSwitchの状態を同期
	useEffect(() => {
		// 年齢確認ローディング中は何もしない
		if (ageVerificationLoading) {
			return;
		}

		const excludeR18Param = searchParams.get("excludeR18");
		// URLパラメータがない場合は成人向けサイトとしてR18表示（excludeR18=false）
		const newShowR18 = excludeR18Param !== null ? excludeR18Param === "false" : true;

		// 状態が変更される場合のみ更新
		if (newShowR18 !== showR18) {
			setShowR18(newShowR18);
		}
	}, [searchParams, ageVerificationLoading, showR18]);

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

	const handleLanguageChange = (value: string) => {
		setLanguageFilter(value);
		updateUrlParam("language", value, "all");
	};

	const handleR18Toggle = (checked: boolean) => {
		// まず状態を更新
		setShowR18(checked);

		// URLパラメータを更新（デフォルトはR18表示、除外は明示的に設定）
		const params = new URLSearchParams(searchParams.toString());

		if (isAdult) {
			// 成人ユーザー：デフォルトはR18表示、除外がオプション
			if (checked) {
				// R18表示時はパラメータを削除（デフォルト=excludeR18=false）
				params.delete("excludeR18");
			} else {
				// R18除外時はパラメータ設定（除外=excludeR18=true）
				params.set("excludeR18", "true");
			}
		} else {
			// 未成年ユーザー：常にR18除外
			params.set("excludeR18", "true");
		}

		params.delete("page"); // ページ番号をリセット

		// 即座にナビゲート
		startTransition(() => {
			router.push(`/works?${params.toString()}`);
		});
	};

	// 検索・フィルターリセット
	const handleReset = () => {
		setSearchQuery("");
		setCategoryFilter("all");
		setLanguageFilter("all");
		setShowR18(true); // デフォルトはR18表示（成人向けサイト）
		setSortBy("newest");
		setItemsPerPageValue("12");
		const params = new URLSearchParams();
		// デフォルトはR18表示なのでパラメータは削除（excludeR18=false）
		// params.delete("excludeR18"); // 既に空なので何もしない
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
				hasActiveFilters={
					searchQuery !== "" ||
					(categoryFilter !== "all" && categoryFilter !== "") ||
					(languageFilter !== "all" && languageFilter !== "") ||
					(isAdult && !showR18) // 成人ユーザーがR18を除外している場合（デフォルトは表示）
				}
				onSearchKeyDown={(e) => {
					if (e.key === "Enter") {
						handleSearch();
					}
				}}
				filters={
					<>
						<FilterSelect
							value={categoryFilter}
							onValueChange={handleCategoryChange}
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
							value={languageFilter}
							onValueChange={handleLanguageChange}
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
						{isAdult ? (
							<div className="flex items-center gap-3 px-3 py-2 border border-border rounded-md bg-background">
								<Shield className="h-4 w-4 text-muted-foreground" />
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium">R18作品表示</span>
									<Switch
										checked={showR18}
										onCheckedChange={handleR18Toggle}
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
				filteredCount={hasFilters ? filteredCount : undefined}
				currentPage={currentPage}
				totalPages={totalPages}
				sortValue={sortBy}
				onSortChange={handleSortChange}
				sortOptions={[
					{ value: "newest", label: "新しい順" },
					{ value: "oldest", label: "古い順" },
					{ value: "popular", label: "人気順" },
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
