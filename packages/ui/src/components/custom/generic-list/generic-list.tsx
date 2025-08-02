"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "../../ui/pagination";
import { Skeleton } from "../../ui/skeleton";
import { ListDisplayControls } from "../list-display-controls";
import {
	ListPageContent,
	ListPageEmptyState,
	ListPageGrid,
	ListPageLayout,
	ListPageStats,
} from "../list-page-layout";
import { FilterSelect, SearchFilterPanel } from "../search-filter-panel";
import type { ListConfig, ListParams, ListResult } from "./types";
import { useListState } from "./use-list-state";

export interface GenericListProps<T> {
	/**
	 * リストの設定オブジェクト
	 * タイトル、ベースURL、フィルター、ソートオプションなどを定義
	 */
	config: ListConfig;

	/**
	 * データ取得関数
	 * ListParams を受け取り、Promise<ListResult<T>> を返す
	 */
	fetchData: (params: ListParams) => Promise<ListResult<T>>;

	/**
	 * 各アイテムのレンダリング関数
	 * @param item - 表示するアイテム
	 * @param index - アイテムのインデックス
	 */
	renderItem: (item: T, index: number) => ReactNode;

	/**
	 * 空状態時のカスタムレンダリング関数
	 * @default デフォルトの空状態メッセージを表示
	 */
	renderEmptyState?: () => ReactNode;

	/**
	 * ローディング時のカスタムスケルトン
	 * @default デフォルトのスケルトンを表示
	 */
	renderLoadingSkeleton?: () => ReactNode;

	/**
	 * レスポンシブグリッドレイアウトの設定
	 * @default { default: 1, md: 2, lg: 3 }
	 */
	gridColumns?: {
		default?: number;
		sm?: number;
		md?: number;
		lg?: number;
		xl?: number;
	};

	/**
	 * カスタムフィルターコンポーネントのレンダリング関数
	 * 標準のフィルターに加えて独自のフィルターUIを追加できる
	 */
	renderCustomFilters?: () => ReactNode;

	/**
	 * カスタムコンテナコンポーネント
	 * アイテムをラップするコンテナをカスタマイズできる
	 * @param children - レンダリングされたアイテムの配列
	 * @default ListPageGrid を使用
	 */
	renderContainer?: (children: ReactNode[]) => ReactNode;

	/**
	 * 追加のCSSクラス名
	 */
	className?: string;
}

/**
 * 汎用リストコンポーネント
 */
export function GenericList<T>({
	config,
	fetchData,
	renderItem,
	renderEmptyState,
	renderLoadingSkeleton,
	gridColumns = {
		default: 1,
		md: 2,
		lg: 3,
	},
	renderCustomFilters,
	renderContainer,
	className,
}: GenericListProps<T>) {
	const {
		state,
		loadData,
		setPage,
		setItemsPerPage,
		setSort,
		setSearch,
		setFilter,
		hasActiveFilters,
	} = useListState(config, fetchData);

	// 初回データ取得
	useEffect(() => {
		loadData();
	}, [loadData]);

	// ページネーションリンクの生成
	const renderPaginationItems = () => {
		const { currentPage, totalPages } = state.pagination;
		const items: ReactNode[] = [];

		// 最大表示ページ数
		const maxPages = 5;
		const halfMax = Math.floor(maxPages / 2);

		let start = Math.max(1, currentPage - halfMax);
		const end = Math.min(totalPages, start + maxPages - 1);

		if (end - start + 1 < maxPages) {
			start = Math.max(1, end - maxPages + 1);
		}

		// 最初のページへのリンク
		if (start > 1) {
			items.push(
				<PaginationItem key="1">
					<PaginationLink onClick={() => setPage(1)}>1</PaginationLink>
				</PaginationItem>,
			);
			if (start > 2) {
				items.push(
					<PaginationItem key="ellipsis-start">
						<PaginationEllipsis />
					</PaginationItem>,
				);
			}
		}

		// ページ番号
		for (let i = start; i <= end; i++) {
			items.push(
				<PaginationItem key={i}>
					<PaginationLink isActive={i === currentPage} onClick={() => setPage(i)}>
						{i}
					</PaginationLink>
				</PaginationItem>,
			);
		}

		// 最後のページへのリンク
		if (end < totalPages) {
			if (end < totalPages - 1) {
				items.push(
					<PaginationItem key="ellipsis-end">
						<PaginationEllipsis />
					</PaginationItem>,
				);
			}
			items.push(
				<PaginationItem key={totalPages}>
					<PaginationLink onClick={() => setPage(totalPages)}>{totalPages}</PaginationLink>
				</PaginationItem>,
			);
		}

		return items;
	};

	// フィルターのレンダリング
	const renderFilters = () => {
		if (!config.filters || config.filters.length === 0) {
			return renderCustomFilters?.();
		}

		return (
			<>
				{config.filters.map((filter) => {
					switch (filter.type) {
						case "select":
							return (
								<FilterSelect
									key={filter.key}
									value={state.filters[filter.key] || filter.defaultValue}
									onValueChange={(value) => setFilter(filter.key, value)}
									placeholder={filter.placeholder || filter.label}
									options={filter.options || []}
								/>
							);
						// 他のフィルタータイプは必要に応じて追加
						default:
							return null;
					}
				})}
				{renderCustomFilters?.()}
			</>
		);
	};

	// ローディングスケルトン
	const defaultLoadingSkeleton = () =>
		renderContainer ? (
			renderContainer(
				Array.from({ length: state.pagination.itemsPerPage }).map((_, index) => (
					<Skeleton key={index} className="h-32 w-full" />
				)),
			)
		) : (
			<ListPageGrid columns={gridColumns}>
				{Array.from({ length: state.pagination.itemsPerPage }).map((_, index) => (
					<Skeleton key={index} className="h-32 w-full" />
				))}
			</ListPageGrid>
		);

	// 空状態
	const defaultEmptyState = () => (
		<ListPageEmptyState
			title="データが見つかりませんでした"
			description="検索条件を変更してお試しください"
		/>
	);

	return (
		<ListPageLayout className={className}>
			<ListPageContent>
				{/* 検索・フィルター */}
				<SearchFilterPanel
					searchValue={state.search}
					onSearchChange={setSearch}
					onSearch={loadData}
					searchPlaceholder="検索..."
					filters={renderFilters()}
				/>

				{/* リスト制御 */}
				<ListDisplayControls
					title={config.title || "一覧"}
					totalCount={state.counts.total}
					filteredCount={hasActiveFilters ? state.counts.filtered : undefined}
					currentPage={state.pagination.currentPage}
					totalPages={state.pagination.totalPages}
					sortValue={state.sort}
					onSortChange={setSort}
					sortOptions={config.sortOptions?.map((s) => ({ value: s.key, label: s.label })) || []}
					itemsPerPageValue={state.pagination.itemsPerPage.toString()}
					onItemsPerPageChange={(value) => setItemsPerPage(Number(value))}
					itemsPerPageOptions={
						config.paginationConfig?.itemsPerPageOptions?.map((n) => ({
							value: n.toString(),
							label: `${n}件/ページ`,
						})) || [
							{ value: "12", label: "12件/ページ" },
							{ value: "24", label: "24件/ページ" },
							{ value: "48", label: "48件/ページ" },
						]
					}
				/>

				{/* コンテンツ */}
				{state.isLoading ? (
					renderLoadingSkeleton?.() || defaultLoadingSkeleton()
				) : state.error ? (
					<div className="text-center py-12">
						<p className="text-destructive">{state.error}</p>
						<button type="button" onClick={loadData} className="mt-4 text-primary hover:underline">
							再試行
						</button>
					</div>
				) : state.counts.displayed === 0 ? (
					renderEmptyState?.() || defaultEmptyState()
				) : renderContainer ? (
					renderContainer(state.items.map((item, index) => renderItem(item, index)))
				) : (
					<ListPageGrid columns={gridColumns}>
						{state.items.map((item, index) => renderItem(item, index))}
					</ListPageGrid>
				)}

				{/* ページネーション */}
				{state.pagination.totalPages > 1 && (
					<div className="mt-8">
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<PaginationPrevious
										onClick={() => setPage(Math.max(1, state.pagination.currentPage - 1))}
										className={
											state.pagination.currentPage === 1
												? "pointer-events-none opacity-50"
												: "cursor-pointer"
										}
									/>
								</PaginationItem>
								{renderPaginationItems()}
								<PaginationItem>
									<PaginationNext
										onClick={() =>
											setPage(
												Math.min(state.pagination.totalPages, state.pagination.currentPage + 1),
											)
										}
										className={
											state.pagination.currentPage === state.pagination.totalPages
												? "pointer-events-none opacity-50"
												: "cursor-pointer"
										}
									/>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				)}

				{/* 統計情報 */}
				{state.counts.displayed > 0 && (
					<ListPageStats
						currentPage={state.pagination.currentPage}
						totalPages={state.pagination.totalPages}
						totalCount={state.counts.filtered}
						itemsPerPage={state.pagination.itemsPerPage}
					/>
				)}
			</ListPageContent>
		</ListPageLayout>
	);
}
