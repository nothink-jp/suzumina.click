import { getCreatorTypeLabel } from "@suzumina.click/shared-types";
import { notFound } from "next/navigation";
import { getCreatorInfo, getCreatorWithWorksWithPagination } from "./actions";
import { CreatorPageClient } from "./components/CreatorPageClient";

export const dynamic = "force-dynamic";

interface CreatorPageProps {
	params: Promise<{ creatorId: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: { params: Promise<{ creatorId: string }> }) {
	const { creatorId } = await params;
	const creator = await getCreatorInfo(creatorId);

	if (!creator) {
		return {
			title: "クリエイター情報 - suzumina.click",
			description: "DLsite作品のクリエイター参加作品一覧",
		};
	}

	const typeLabel = getCreatorTypeLabel(creator.types);

	return {
		title: `${creator.name} - suzumina.click`,
		description: `クリエイター「${creator.name}」（${typeLabel}）の参加作品一覧。総作品数: ${creator.workCount}作品`,
		openGraph: {
			title: `${creator.name} - suzumina.click`,
			description: `クリエイター「${creator.name}」（${typeLabel}）の参加作品一覧。総作品数: ${creator.workCount}作品`,
		},
	};
}

export default async function CreatorPage({ params, searchParams }: CreatorPageProps) {
	const { creatorId } = await params;
	const searchParamsData = await searchParams;

	const pageNumber = Number.parseInt(searchParamsData.page as string, 10) || 1;
	const validPage = Math.max(1, pageNumber);
	const limitValue = Number.parseInt(searchParamsData.limit as string, 10) || 12;
	const validLimit = [12, 24, 48].includes(limitValue) ? limitValue : 12;
	const sort = typeof searchParamsData.sort === "string" ? searchParamsData.sort : "newest";

	const data = await getCreatorWithWorksWithPagination(creatorId, validPage, validLimit, sort);

	if (!data) {
		notFound();
	}

	const { creator, works, totalCount } = data;

	return (
		<CreatorPageClient
			creator={creator}
			initialData={works}
			initialTotalCount={totalCount}
			initialPage={validPage}
			_searchParams={searchParamsData}
		/>
	);
}
