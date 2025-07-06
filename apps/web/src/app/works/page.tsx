import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { Suspense } from "react";
import { getWorks } from "./actions";
import WorkList from "./components/WorkList";

interface WorksPageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WorksPage({ searchParams }: WorksPageProps) {
	const params = await searchParams;
	const pageNumber = Number.parseInt(params.page as string, 10) || 1;
	const validPage = Math.max(1, pageNumber);
	const sort = typeof params.sort === "string" ? params.sort : "newest";
	const search = typeof params.search === "string" ? params.search : undefined;
	const category = typeof params.category === "string" ? params.category : undefined;
	const language = typeof params.language === "string" ? params.language : undefined;
	const limitValue = Number.parseInt(params.limit as string, 10) || 12;
	const validLimit = [12, 24, 48, 96].includes(limitValue) ? limitValue : 12;

	// 並行してデータを取得
	const result = await getWorks({
		page: validPage,
		limit: validLimit,
		sort,
		search,
		category,
		language,
	});
	const { works: initialData, totalCount } = result;

	return (
		<ListPageLayout>
			<ListPageHeader
				title="作品一覧"
				description="涼花みなせさんの音声作品情報を参照・表示。DLsite公式サイトであなたにぴったりの作品を見つけよう"
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
					<WorkList data={initialData} totalCount={totalCount || 0} currentPage={validPage} />
				</Suspense>
			</ListPageContent>
		</ListPageLayout>
	);
}

// メタデータ設定
export const metadata = {
	title: "作品一覧",
	description:
		"涼花みなせさんの音声作品情報を参照・表示。DLsite公式サイトであなたにぴったりの作品を見つけよう。癒し系作品からASMRまで、幅広いジャンルの音声作品情報を確認できます。",
	keywords: ["涼花みなせ", "DLsite", "音声作品", "ASMR", "癒し", "作品紹介", "ファンサイト"],
	openGraph: {
		title: "作品一覧 | suzumina.click",
		description:
			"涼花みなせさんの音声作品情報を参照・表示。DLsite公式サイトであなたにぴったりの作品を見つけよう。癒し系作品からASMRまで、幅広いジャンルの音声作品情報を確認できます。",
		url: "https://suzumina.click/works",
	},
	alternates: {
		canonical: "/works",
	},
};
