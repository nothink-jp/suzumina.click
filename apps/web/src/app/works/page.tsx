import { WorksPageClient } from "@/components/content/works-page-client";
import { getWorks } from "./actions";
import { parseWorksSearchParams } from "./lib/parse-search-params";

interface WorksPageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WorksPage({ searchParams }: WorksPageProps) {
	const rawParams = await searchParams;
	// Next.jsのsearchParamsは既にデコード済みの値を提供
	const getParam = (key: string): string | undefined => {
		const value = rawParams[key];
		return typeof value === "string" ? value : undefined;
	};
	const { page, limit, sort, search, category, language, genres } = parseWorksSearchParams({
		get: getParam,
	});

	// showR18パラメータの処理
	// 年齢確認状態はlocalStorage駆動でServer Componentからは読めないため、
	// URL指定が無い場合は fail-closed（R18除外）をデフォルトにする。
	// このHTMLはCDNエッジで全訪問者に共有キャッシュされる（terraform/cloudflare.tf #5・
	// next.config.mjsのCache-Control）ため、未確認訪問者を含む全員に安全な内容のみ返す必要がある。
	// 年齢確認済みの成人はhydration後、クライアント側の再フェッチで showR18: true を明示送信する
	// （works-list.tsx 参照。ここで解析した initialParams を props で渡し同じ条件で再取得する）。
	const showR18FromParams = getParam("showR18");
	const shouldShowR18 = showR18FromParams !== undefined ? showR18FromParams === "true" : false;

	// 初期データを取得
	const result = await getWorks({
		page,
		limit,
		sort,
		search,
		category,
		language,
		genres,
		showR18: shouldShowR18,
	});

	return (
		<WorksPageClient
			initialData={result}
			initialParams={{ page, limit, sort, search, category, language, genres }}
		/>
	);
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
