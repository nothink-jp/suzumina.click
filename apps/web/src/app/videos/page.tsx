import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom";
import { Suspense } from "react";
import { getVideosList } from "./actions";
import VideoList from "./components/VideoList";

interface VideosPageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function VideosPage({ searchParams }: VideosPageProps) {
	const params = await searchParams;

	// 初期データを取得
	const initialData = await getVideosList({
		page: Number.parseInt((params.page as string) || "1", 10),
		limit: Number.parseInt((params.limit as string) || "12", 10),
		sort: (params.sort as string) || "newest",
		search: params.q as string,
		filters: {
			year: params.year as string,
			categoryNames: params.categoryNames as string,
			videoType: params.videoType as string,
			playlistTags: params.playlistTags as string | string[],
			userTags: params.userTags as string | string[],
		},
	});

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
					<VideoList initialData={initialData} />
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
