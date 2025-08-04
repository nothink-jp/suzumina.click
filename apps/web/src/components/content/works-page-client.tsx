"use client";

import type { WorkListResultPlain } from "@suzumina.click/shared-types";
import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { Suspense, useEffect, useState } from "react";
import { getWorks } from "@/app/works/actions";
import WorksListGeneric from "@/app/works/components/WorksListGeneric";
import { useAgeVerification } from "@/contexts/age-verification-context";

interface WorksPageClientProps {
	searchParams: { [key: string]: string | string[] | undefined };
	initialData: WorkListResultPlain;
}

export function WorksPageClient({ searchParams, initialData }: WorksPageClientProps) {
	const { showR18Content, isLoading: ageVerificationLoading } = useAgeVerification();
	const [data, setData] = useState<WorkListResultPlain>(initialData);
	const [isLoadingData, setIsLoadingData] = useState(false);

	// 検索パラメータを取得する関数
	const getSearchParams = () => {
		const pageNumber = Number.parseInt(searchParams.page as string, 10) || 1;
		const validPage = Math.max(1, pageNumber);
		const sort = typeof searchParams.sort === "string" ? searchParams.sort : "newest";
		const search = typeof searchParams.search === "string" ? searchParams.search : undefined;
		const category = typeof searchParams.category === "string" ? searchParams.category : undefined;
		const language = typeof searchParams.language === "string" ? searchParams.language : undefined;
		const limitValue = Number.parseInt(searchParams.limit as string, 10) || 12;
		const validLimit = [12, 24, 48].includes(limitValue) ? limitValue : 12;

		return { validPage, validLimit, sort, search, category, language };
	};

	// 年齢確認状態が変更されたら、適切なデータを再取得
	useEffect(() => {
		if (ageVerificationLoading) return;

		// URLパラメータにshowR18が明示的に指定されている場合は再取得しない
		if (searchParams.showR18 !== undefined) return;

		// 初期データが適切な場合は再取得しない
		// サーバーサイドではshowR18=falseで取得しているため、
		// 年齢確認済みユーザーの場合は再取得が必要
		if (showR18Content) {
			setIsLoadingData(true);
			const { validPage, validLimit, sort, search, category, language } = getSearchParams();

			getWorks({
				page: validPage,
				limit: validLimit,
				sort,
				search,
				category,
				language,
				showR18: true, // 年齢確認済みの場合はR18表示
			})
				.then(setData)
				.finally(() => setIsLoadingData(false));
		}
	}, [ageVerificationLoading, showR18Content, searchParams]);

	if (ageVerificationLoading || isLoadingData) {
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
					<WorksListGeneric initialData={data} />
				</Suspense>
			</ListPageContent>
		</ListPageLayout>
	);
}
