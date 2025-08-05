import { notFound } from "next/navigation";
import { fetchCircleWorksForConfigurableList, getCircleInfo } from "./actions";
import { CirclePageClient } from "./components/CirclePageClient";

export const dynamic = "force-dynamic";

interface CirclePageProps {
	params: Promise<{ circleId: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: { params: Promise<{ circleId: string }> }) {
	const { circleId } = await params;
	const circle = await getCircleInfo(circleId);

	if (!circle) {
		return {
			title: "サークル情報 - suzumina.click",
			description: "DLsiteサークルの作品一覧",
		};
	}

	return {
		title: `${circle.name} - suzumina.click`,
		description: `サークル「${circle.name}」の作品一覧。総作品数: ${circle.workCount}作品`,
		openGraph: {
			title: `${circle.name} - suzumina.click`,
			description: `サークル「${circle.name}」の作品一覧。総作品数: ${circle.workCount}作品`,
		},
	};
}

export default async function CirclePage({ params, searchParams }: CirclePageProps) {
	const { circleId } = await params;
	const searchParamsData = await searchParams;

	// サークル情報を取得
	const circle = await getCircleInfo(circleId);
	if (!circle) {
		notFound();
	}

	// URLパラメータの処理
	const pageNumber = Number.parseInt(searchParamsData.page as string, 10) || 1;
	const validPage = Math.max(1, pageNumber);
	const limitValue = Number.parseInt(searchParamsData.limit as string, 10) || 12;
	const validLimit = [12, 24, 48].includes(limitValue) ? limitValue : 12;
	const sort = typeof searchParamsData.sort === "string" ? searchParamsData.sort : "newest";
	const search = typeof searchParamsData.q === "string" ? searchParamsData.q : undefined;

	// 初期データを取得
	const result = await fetchCircleWorksForConfigurableList({
		circleId,
		page: validPage,
		limit: validLimit,
		sort,
		search,
	});

	return (
		<CirclePageClient
			circle={circle}
			initialData={{
				works: result.works,
				totalCount: result.totalCount,
				filteredCount: result.filteredCount,
				hasMore: result.works.length === validLimit,
			}}
		/>
	);
}
