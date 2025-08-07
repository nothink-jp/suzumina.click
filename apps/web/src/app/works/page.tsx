import { WorksPageClient } from "@/components/content/works-page-client";
import { getWorks } from "./actions";

// ジャンルパラメータをパースする関数（複雑度を下げるため分離）
function parseGenres(genresParam: string | undefined): string[] | undefined {
	if (typeof genresParam !== "string") return undefined;

	// Next.jsのsearchParamsは既にデコード済みの値を提供
	if (genresParam.includes("|")) {
		// 新形式: パイプ区切り
		return genresParam.split("|").filter(Boolean);
	}
	if (genresParam.includes(",") && !genresParam.includes(" ")) {
		// 旧形式: カンマ区切り（スペースを含まない場合のみ）
		return genresParam.split(",").filter(Boolean);
	}
	// 単一の値（スペースを含む可能性がある）
	return [genresParam];
}

interface WorksPageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WorksPage({ searchParams }: WorksPageProps) {
	const params = await searchParams;
	const pageNumber = Number.parseInt(params.page as string, 10) || 1;
	const validPage = Math.max(1, pageNumber);
	const sort = typeof params.sort === "string" ? params.sort : "newest";
	const search = typeof params.q === "string" ? params.q : undefined;
	const category = typeof params.category === "string" ? params.category : undefined;
	const language = typeof params.language === "string" ? params.language : undefined;
	const genres = parseGenres(params.genres as string);
	const limitValue = Number.parseInt(params.limit as string, 10) || 12;
	const validLimit = [12, 24, 48].includes(limitValue) ? limitValue : 12;

	// showR18パラメータの処理
	// URLパラメータが明示的に指定されている場合はその値を使用
	// 指定されていない場合はundefinedとして、クライアント側で判断させる
	// 動作仕様:
	// - undefined: URLにshowR18パラメータがない場合。全作品を表示（R18含む）
	// - true: showR18=trueの場合。R18作品も表示
	// - false: showR18=falseの場合。R18作品を除外
	const showR18FromParams = params.showR18;
	const shouldShowR18 = showR18FromParams !== undefined ? showR18FromParams === "true" : undefined;

	// 初期データを取得
	// showR18がundefinedの場合はデフォルトで全件取得（クライアント側でフィルタリング）
	const result = await getWorks({
		page: validPage,
		limit: validLimit,
		sort,
		search,
		category,
		language,
		genres,
		showR18: shouldShowR18, // undefinedの場合はundefinedのまま渡す
	});

	return <WorksPageClient initialData={result} />;
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
