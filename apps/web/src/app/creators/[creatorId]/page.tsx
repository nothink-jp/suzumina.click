import { getCreatorTypeLabel } from "@suzumina.click/shared-types";
import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCreatorInfo, getCreatorWorksList } from "./actions";
import { CreatorPageClient } from "./components/creator-page-client";

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
		alternates: {
			canonical: `/creators/${creatorId}`,
		},
		openGraph: {
			title: `${creator.name} - suzumina.click`,
			description: `クリエイター「${creator.name}」（${typeLabel}）の参加作品一覧。総作品数: ${creator.workCount}作品`,
		},
	};
}

export default function CreatorPage(props: CreatorPageProps) {
	return (
		<Suspense fallback={<LoadingSkeleton variant="card" />}>
			<CreatorContent {...props} />
		</Suspense>
	);
}

export async function CreatorContent({ params, searchParams }: CreatorPageProps) {
	const { creatorId } = await params;
	const searchParamsData = await searchParams;

	const pageNumber = Number.parseInt(searchParamsData.page as string, 10) || 1;
	const validPage = Math.max(1, pageNumber);
	const limitValue = Number.parseInt(searchParamsData.limit as string, 10) || 12;
	const validLimit = [12, 24, 48].includes(limitValue) ? limitValue : 12;
	const sort = typeof searchParamsData.sort === "string" ? searchParamsData.sort : "newest";
	const search = typeof searchParamsData.q === "string" ? searchParamsData.q : undefined;

	// クリエイター情報と作品を並列で取得
	const [creator, worksResult] = await Promise.all([
		getCreatorInfo(creatorId),
		getCreatorWorksList({
			creatorId,
			page: validPage,
			limit: validLimit,
			sort,
			search,
		}),
	]);

	if (!creator) {
		notFound();
	}

	const { works, totalCount, filteredCount } = worksResult;

	return (
		<CreatorPageClient
			creator={creator}
			initialData={works}
			initialTotalCount={totalCount}
			initialFilteredCount={filteredCount}
		/>
	);
}
