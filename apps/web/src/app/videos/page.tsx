import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { Suspense } from "react";
import { getTotalVideoCountV2, getVideoTitlesV2 } from "./actions-v2";
import VideoList from "./components/VideoList";

interface VideosPageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 3層タグパラメータ解析と検索条件処理が必要
export default async function VideosPage({ searchParams }: VideosPageProps) {
	const params = await searchParams;
	const pageNumber = Number.parseInt(params.page as string, 10) || 1;
	const validPage = Math.max(1, pageNumber);
	const year = typeof params.year === "string" ? params.year : undefined;
	const sort = typeof params.sort === "string" ? params.sort : "newest";
	const search = typeof params.search === "string" ? params.search : undefined;
	const limitValue = Number.parseInt(params.limit as string, 10) || 12;
	const validLimit = [12, 24, 48].includes(limitValue) ? limitValue : 12;

	// 3層タグフィルターパラメータの抽出
	const playlistTags = Array.isArray(params.playlistTags)
		? params.playlistTags
		: typeof params.playlistTags === "string"
			? [params.playlistTags]
			: undefined;
	const userTags = Array.isArray(params.userTags)
		? params.userTags
		: typeof params.userTags === "string"
			? [params.userTags]
			: undefined;
	const categoryNames = Array.isArray(params.categoryNames)
		? params.categoryNames
		: typeof params.categoryNames === "string"
			? [params.categoryNames]
			: undefined;
	const videoType = typeof params.videoType === "string" ? params.videoType : undefined;

	// 並行してデータを取得
	const [initialData, filteredCount, totalCount] = await Promise.all([
		getVideoTitlesV2({
			page: validPage,
			limit: validLimit,
			year,
			sort,
			search,
			playlistTags,
			userTags,
			categoryNames, // 複合インデックス作成後に有効化
			videoType,
		}),
		getTotalVideoCountV2({
			year,
			search,
			playlistTags,
			userTags,
			categoryNames, // 複合インデックス作成後に有効化
			videoType,
		}),
		getTotalVideoCountV2({}), // フィルタなしの総件数
	]);

	return (
		<ListPageLayout>
			<ListPageHeader
				title="動画一覧"
				description="涼花みなせさんのYouTube動画から、あなただけの音声ボタンを作成しよう"
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
						filteredCount={
							year || search || playlistTags || userTags || categoryNames || videoType
								? filteredCount
								: undefined
						}
						currentPage={validPage}
					/>
				</Suspense>
			</ListPageContent>
		</ListPageLayout>
	);
}

// メタデータ設定
export const metadata = {
	title: "動画一覧",
	description:
		"涼花みなせさんのYouTube動画から、あなただけの音声ボタンを作成しよう。配信アーカイブからお気に入りの動画を見つけて、特別な瞬間を音声ボタンにして保存しよう。",
	keywords: ["涼花みなせ", "YouTube", "動画", "音声ボタン作成", "配信", "アーカイブ", "切り抜き"],
	openGraph: {
		title: "動画一覧 | すずみなくりっく！",
		description:
			"涼花みなせさんのYouTube動画から、あなただけの音声ボタンを作成しよう。配信アーカイブからお気に入りの動画を見つけて、特別な瞬間を音声ボタンにして保存しよう。",
		url: "https://suzumina.click/videos",
	},
	alternates: {
		canonical: "/videos",
	},
};
