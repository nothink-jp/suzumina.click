"use client";

import type { CirclePlainObject, WorkPlainObject } from "@suzumina.click/shared-types";
import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import WorkList from "@/app/works/components/WorkList";
import { getCircleWorksWithPagination } from "../actions";

interface CirclePageClientProps {
	circle: CirclePlainObject;
	initialData: WorkPlainObject[];
	initialTotalCount: number;
	initialPage: number;
	_searchParams: { [key: string]: string | string[] | undefined };
}

export function CirclePageClient({
	circle,
	initialData,
	initialTotalCount,
	initialPage,
	_searchParams,
}: CirclePageClientProps) {
	const searchParamsHook = useSearchParams();
	const [data, setData] = useState<WorkPlainObject[]>(initialData);
	const [totalCount, setTotalCount] = useState(initialTotalCount);
	const [isLoading, setIsLoading] = useState(false);

	// ヘルパー関数：状態を更新
	const updateState = useCallback((works: WorkPlainObject[], count: number) => {
		setData(works);
		setTotalCount(count);
	}, []);

	// 現在のページ状態を管理
	const [currentPage, setCurrentPage] = useState(initialPage);

	// ページネーション変更時のデータ取得
	useEffect(() => {
		const pageFromUrl = Number.parseInt(searchParamsHook.get("page") || "1", 10);
		const limitFromUrl = Number.parseInt(searchParamsHook.get("limit") || "12", 10);
		const sortFromUrl = searchParamsHook.get("sort") || "newest";

		// 初期ロード時は既にデータがあるのでスキップ
		if (
			pageFromUrl === initialPage &&
			limitFromUrl === 12 &&
			sortFromUrl === "newest" &&
			data.length > 0
		) {
			return;
		}

		// ページが変更された場合は更新
		if (pageFromUrl !== currentPage) {
			setCurrentPage(pageFromUrl);
		}

		const fetchData = async () => {
			setIsLoading(true);
			try {
				const result = await getCircleWorksWithPagination(
					circle.circleId,
					pageFromUrl,
					limitFromUrl,
					sortFromUrl,
				);
				updateState(result.works, result.totalCount);
			} catch (_error) {
				// Error handling - silent fail to prevent console noise
			} finally {
				setIsLoading(false);
			}
		};

		fetchData();
	}, [searchParamsHook, circle.circleId, currentPage, updateState, initialPage, data.length]);

	return (
		<ListPageLayout>
			<ListPageHeader
				title={circle.name}
				description={`${circle.nameEn ? `${circle.nameEn} - ` : ""}作品数: ${circle.workCount}件`}
			/>

			<ListPageContent>
				<Suspense
					fallback={
						<div className="text-center py-12">
							<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
							<p className="mt-2 text-muted-foreground">読み込み中...</p>
						</div>
					}
				>
					{isLoading ? (
						<div className="text-center py-12">
							<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
							<p className="mt-2 text-muted-foreground">ページ読み込み中...</p>
						</div>
					) : (
						<WorkList
							data={data}
							totalCount={totalCount}
							currentPage={currentPage}
							showFilters={false}
							baseUrl={`/circles/${circle.circleId}`}
						/>
					)}
				</Suspense>
			</ListPageContent>
		</ListPageLayout>
	);
}
