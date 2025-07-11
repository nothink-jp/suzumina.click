"use client";

import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types";
import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { Suspense, useEffect, useState } from "react";
import { getWorks } from "@/app/works/actions";
import WorkList from "@/app/works/components/WorkList";
import { useAgeVerification } from "@/contexts/AgeVerificationContext";

interface WorksPageClientProps {
	searchParams: { [key: string]: string | string[] | undefined };
	initialData: FrontendDLsiteWorkData[];
	initialTotalCount: number;
	initialPage: number;
}

export function WorksPageClient({
	searchParams,
	initialData,
	initialTotalCount,
	initialPage,
}: WorksPageClientProps) {
	const { showR18Content, isLoading: ageVerificationLoading } = useAgeVerification();
	const [data, setData] = useState(initialData);
	const [totalCount, setTotalCount] = useState(initialTotalCount);
	const [filteredCount, setFilteredCount] = useState<number | undefined>(undefined);
	const [isLoading, setIsLoading] = useState(false);

	// 年齢確認状態が変更された時にデータを再取得
	useEffect(() => {
		if (ageVerificationLoading) return;

		const fetchData = async () => {
			setIsLoading(true);
			try {
				const pageNumber = Number.parseInt(searchParams.page as string, 10) || 1;
				const validPage = Math.max(1, pageNumber);
				const sort = typeof searchParams.sort === "string" ? searchParams.sort : "newest";
				const search = typeof searchParams.search === "string" ? searchParams.search : undefined;
				const category =
					typeof searchParams.category === "string" ? searchParams.category : undefined;
				const language =
					typeof searchParams.language === "string" ? searchParams.language : undefined;
				const limitValue = Number.parseInt(searchParams.limit as string, 10) || 12;
				const validLimit = [12, 24, 48, 96].includes(limitValue) ? limitValue : 12;

				// URLパラメータからexcludeR18を取得、年齢確認状況に基づいてデフォルト値を決定
				const excludeR18FromParams = searchParams.excludeR18;
				const shouldExcludeR18 =
					excludeR18FromParams !== undefined ? excludeR18FromParams === "true" : !showR18Content; // 年齢確認状況に基づくデフォルト値（未成年またはR18を見ない設定の場合は除外）

				const result = await getWorks({
					page: validPage,
					limit: validLimit,
					sort,
					search,
					category,
					language,
					excludeR18: shouldExcludeR18,
				});

				setData(result.works);
				setTotalCount(result.totalCount || 0);
				setFilteredCount(result.filteredCount);
			} catch (_error) {
				// Error handling - silent fail to prevent console noise
			} finally {
				setIsLoading(false);
			}
		};

		fetchData();
	}, [showR18Content, ageVerificationLoading, searchParams]);

	if (ageVerificationLoading) {
		return (
			<ListPageLayout>
				<ListPageHeader
					title="作品一覧"
					description="涼花みなせさんの音声作品情報を参照・表示。DLsite公式サイトであなたにぴったりの作品を見つけよう"
				/>
				<ListPageContent>
					<div className="text-center py-12">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
						<p className="mt-2 text-muted-foreground">読み込み中...</p>
					</div>
				</ListPageContent>
			</ListPageLayout>
		);
	}

	return (
		<ListPageLayout>
			<ListPageHeader
				title="作品一覧"
				description={
					showR18Content
						? "涼花みなせさんの音声作品情報を参照・表示。DLsite公式サイトであなたにぴったりの作品を見つけよう"
						: "🛡️ 全年齢対象 - 年齢制限のない作品をお楽しみください。涼花みなせさんの全年齢対象作品を表示しています"
				}
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
							<p className="mt-2 text-muted-foreground">フィルタリング中...</p>
						</div>
					) : (
						<WorkList
							data={data}
							totalCount={totalCount}
							filteredCount={filteredCount}
							currentPage={initialPage}
						/>
					)}
				</Suspense>
			</ListPageContent>
		</ListPageLayout>
	);
}
