import { CreatorsPageClient } from "@/components/content/creators-page-client";
import { getCreators } from "./actions";

interface CreatorsPageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CreatorsPage({ searchParams }: CreatorsPageProps) {
	const params = await searchParams;
	const pageNumber = Number.parseInt(params.page as string, 10) || 1;
	const validPage = Math.max(1, pageNumber);
	const sort = typeof params.sort === "string" ? params.sort : "name";
	const search = typeof params.q === "string" ? params.q : undefined;
	const role = typeof params.role === "string" ? params.role : undefined;
	const limitValue = Number.parseInt(params.limit as string, 10) || 12;
	const validLimit = [12, 24, 48].includes(limitValue) ? limitValue : 12;

	// 初期データを取得
	const result = await getCreators({
		page: validPage,
		limit: validLimit,
		sort,
		search,
		role,
	});

	return <CreatorsPageClient initialData={result} />;
}

// メタデータ設定
export const metadata = {
	title: "クリエイター一覧",
	description:
		"音声作品を手がけるクリエイターの一覧。声優、イラストレーター、シナリオライターなど、役割別に検索・並び替えができます。",
	keywords: ["クリエイター", "声優", "イラストレーター", "シナリオライター", "音楽", "音声作品"],
	openGraph: {
		title: "クリエイター一覧 | すずみなくりっく！",
		description:
			"音声作品を手がけるクリエイターの一覧。声優、イラストレーター、シナリオライターなど、役割別に検索・並び替えができます。",
		url: "https://suzumina.click/creators",
	},
	alternates: {
		canonical: "/creators",
	},
};
