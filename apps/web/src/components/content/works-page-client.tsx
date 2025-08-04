"use client";

import type { WorkListResultPlain } from "@suzumina.click/shared-types";
import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { Suspense } from "react";
import WorksListGeneric from "@/app/works/components/WorksListGeneric";
import { useAgeVerification } from "@/contexts/age-verification-context";

interface WorksPageClientProps {
	searchParams: { [key: string]: string | string[] | undefined };
	initialData: WorkListResultPlain;
}

export function WorksPageClient({ searchParams, initialData }: WorksPageClientProps) {
	const { showR18Content, isLoading: ageVerificationLoading } = useAgeVerification();

	// URLパラメータからexcludeR18を取得、年齢確認状況に基づいてデフォルト値を決定
	const excludeR18FromParams = searchParams.excludeR18;
	const shouldExcludeR18 =
		excludeR18FromParams !== undefined ? excludeR18FromParams === "true" : !showR18Content;

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
					<WorksListGeneric
						searchParams={searchParams}
						initialData={initialData}
						excludeR18={shouldExcludeR18}
					/>
				</Suspense>
			</ListPageContent>
		</ListPageLayout>
	);
}
