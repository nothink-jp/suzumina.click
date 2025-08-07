import { CirclesPageClient } from "@/components/content/circles-page-client";
import { getCircles } from "./actions";

interface CirclesPageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CirclesPage({ searchParams }: CirclesPageProps) {
	const params = await searchParams;
	const pageNumber = Number.parseInt(params.page as string, 10) || 1;
	const validPage = Math.max(1, pageNumber);
	const sort = typeof params.sort === "string" ? params.sort : "name";
	const search = typeof params.q === "string" ? params.q : undefined;
	const limitValue = Number.parseInt(params.limit as string, 10) || 12;
	const validLimit = [12, 24, 48].includes(limitValue) ? limitValue : 12;

	// 初期データを取得
	const result = await getCircles({
		page: validPage,
		limit: validLimit,
		sort,
		search,
	});

	return <CirclesPageClient initialData={result} />;
}

// メタデータ設定
export const metadata = {
	title: "サークル一覧",
	description: "DLsiteで活動するサークルの一覧。作品数やサークル名で検索・並び替えができます。",
	keywords: ["DLsite", "サークル", "制作者", "クリエイター", "音声作品"],
	openGraph: {
		title: "サークル一覧 | すずみなくりっく！",
		description: "DLsiteで活動するサークルの一覧。作品数やサークル名で検索・並び替えができます。",
		url: "https://suzumina.click/circles",
	},
	alternates: {
		canonical: "/circles",
	},
};
