import { Suspense } from "react";
import { getTotalVideoCount, getVideoTitles } from "./actions";
import VideoList from "./components/VideoList";

interface VideosPageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function VideosPage({ searchParams }: VideosPageProps) {
	const resolvedSearchParams = await searchParams;
	const pageParam = resolvedSearchParams.page;
	const currentPage =
		pageParam && typeof pageParam === "string" ? Number.parseInt(pageParam, 10) : 1;
	const validPage = Math.max(1, Number.isNaN(currentPage) ? 1 : currentPage);

	// 並行してデータを取得
	const [initialData, totalCount] = await Promise.all([
		getVideoTitles({ page: validPage, limit: 12 }),
		getTotalVideoCount(),
	]);

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm">
				<div className="max-w-7xl mx-auto px-4 py-6">
					<h1 className="text-4xl font-bold text-foreground mb-2">動画一覧</h1>
					<p className="text-muted-foreground">
						涼花みなせさんのYouTube動画から音声ボタンを作成できます
					</p>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 py-8">
				<Suspense
					fallback={
						<div className="text-center py-12">
							<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
							<p className="mt-2 text-muted-foreground">読み込み中...</p>
						</div>
					}
				>
					<VideoList data={initialData} totalCount={totalCount} currentPage={validPage} />
				</Suspense>
			</main>
		</div>
	);
}

// メタデータ設定
export const metadata = {
	title: "動画一覧 | suzumina.click",
	description: "涼花みなせさんのYouTube動画一覧。お気に入りの動画から音声ボタンを作成できます。",
};
