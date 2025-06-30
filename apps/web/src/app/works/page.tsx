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
	const limitValue = Number.parseInt(params.limit as string, 10) || 12;
	const validLimit = [12, 24, 48, 96].includes(limitValue) ? limitValue : 12;

	// 並行してデータを取得
	const result = await getWorks({ page: validPage, limit: validLimit, sort, search, category });
	const { works: initialData, totalCount } = result;

	return (
		<ListPageLayout>
			<ListPageHeader title="作品一覧" description="涼花みなせさんの音声作品を探索・購入できます" />

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
	title: "作品一覧 | suzumina.click",
	description:
		"涼花みなせさんが出演するDLsite音声作品の一覧。癒し系作品からASMRまで幅広く揃っています。",
};
