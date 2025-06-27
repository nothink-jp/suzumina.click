import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { Suspense } from "react";
import { getTotalVideoCount, getVideoTitles } from "./actions";
import VideoList from "./components/VideoList";

interface VideosPageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function VideosPage({ searchParams }: VideosPageProps) {
	const resolvedSearchParams = await searchParams;
	const pageParam = resolvedSearchParams.page;
	const yearParam = resolvedSearchParams.year;
	const sortParam = resolvedSearchParams.sort;
	const currentPage =
		pageParam && typeof pageParam === "string" ? Number.parseInt(pageParam, 10) : 1;
	const validPage = Math.max(1, Number.isNaN(currentPage) ? 1 : currentPage);
	const year = yearParam && typeof yearParam === "string" ? yearParam : undefined;
	const sort = sortParam && typeof sortParam === "string" ? sortParam : "newest";

	// 並行してデータを取得
	const [initialData, filteredCount, totalCount] = await Promise.all([
		getVideoTitles({ page: validPage, limit: 12, year, sort }),
		getTotalVideoCount({ year }),
		getTotalVideoCount({}), // フィルタなしの総件数
	]);

	return (
		<ListPageLayout>
			<ListPageHeader
				title="動画一覧"
				description="涼花みなせさんのYouTube動画から音声ボタンを作成できます"
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
					<VideoList
						data={initialData}
						totalCount={totalCount}
						filteredCount={year ? filteredCount : undefined}
						currentPage={validPage}
					/>
				</Suspense>
			</ListPageContent>
		</ListPageLayout>
	);
}

// メタデータ設定
export const metadata = {
	title: "動画一覧 | suzumina.click",
	description: "涼花みなせさんのYouTube動画一覧。お気に入りの動画から音声ボタンを作成できます。",
};
