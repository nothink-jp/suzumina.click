import { WorksPageClient } from "@/components/content/works-page-client";
import { getWorks } from "./actions";

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
	const validLimit = [12, 24, 48].includes(limitValue) ? limitValue : 12;

	// showR18パラメータの処理（成人向けサイトのため、デフォルトでR18表示）
	const showR18FromParams = params.showR18;
	const shouldShowR18 = showR18FromParams !== undefined ? showR18FromParams === "true" : true; // デフォルトでR18表示（成人向けサイト）

	// 初期データを取得
	const result = await getWorks({
		page: validPage,
		limit: validLimit,
		sort,
		search,
		category,
		language,
		showR18: shouldShowR18,
	});

	return <WorksPageClient searchParams={params} initialData={result} />;
}

// メタデータ設定
export const metadata = {
	title: "作品一覧",
	description:
		"涼花みなせさんの音声作品情報を参照・表示。DLsite公式サイトであなたにぴったりの作品を見つけよう。癒し系作品からASMRまで、幅広いジャンルの音声作品情報を確認できます。",
	keywords: ["涼花みなせ", "DLsite", "音声作品", "ASMR", "癒し", "作品紹介", "ファンサイト"],
	openGraph: {
		title: "作品一覧 | すずみなくりっく！",
		description:
			"涼花みなせさんの音声作品情報を参照・表示。DLsite公式サイトであなたにぴったりの作品を見つけよう。癒し系作品からASMRまで、幅広いジャンルの音声作品情報を確認できます。",
		url: "https://suzumina.click/works",
	},
	alternates: {
		canonical: "/works",
	},
};
