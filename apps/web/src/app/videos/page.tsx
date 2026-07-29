import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom";
import { Suspense } from "react";
import { getVideosList } from "./actions";
import { OpenByVideoId } from "./components/open-by-video-id";
import VideoList from "./components/video-list";
import { resolveVideoViewTab, VideoViewTabs } from "./components/video-view-tabs";

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

	const activeTab = resolveVideoViewTab({
		videoType: params.videoType as string | undefined,
		sort: params.sort as string | undefined,
	});

	return (
		<ListPageLayout>
			<ListPageHeader
				title="動画一覧"
				description="涼花みなせさんのYouTube動画から、あなただけの音声ボタンを作成しよう"
			/>

			<ListPageContent>
				<div className="space-y-3 mb-6">
					<VideoViewTabs active={activeTab} />
					{/* 拾える配信 = S4「どの配信を拾うか決める」の家（導線再設計 段3）。
					    説明と URL 直接指定（旧 /watch 未選択状態の移設先）はこのビューだけに置く */}
					{activeTab === "pickable" && (
						<div className="space-y-2">
							<p className="text-sm text-muted-foreground">
								ボタンが少ない配信を、新しさで並べています。「まだ0本」はまだ誰も拾っていない配信です。
							</p>
							<OpenByVideoId />
						</div>
					)}
				</div>
				<Suspense
					fallback={
						<div className="text-center py-12">
							<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
							<p className="mt-2 text-muted-foreground">読み込み中...</p>
						</div>
					}
				>
					{/* key: タブ切替（=URL プリセット変更）で ConfigurableList の内部状態を確実に作り直す */}
					<VideoList key={activeTab} initialData={initialData} />
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
