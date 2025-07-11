import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { Suspense } from "react";
import AudioButtonsList from "./components/AudioButtonsList";

interface SearchParams {
	q?: string;
	category?: string;
	tags?: string;
	sort?: string;
	page?: string;
	sourceVideoId?: string;
}

interface AudioButtonsPageProps {
	searchParams: Promise<SearchParams>;
}

export default async function AudioButtonsPage({ searchParams }: AudioButtonsPageProps) {
	const resolvedSearchParams = await searchParams;

	return (
		<ListPageLayout>
			<ListPageHeader
				title="音声ボタン一覧"
				description="涼花みなせさんの音声ボタンで、好きな声をいつでも楽しもう"
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
					<AudioButtonsList searchParams={resolvedSearchParams} />
				</Suspense>
			</ListPageContent>
		</ListPageLayout>
	);
}

// メタデータ設定
export const metadata = {
	title: "音声ボタン一覧",
	description:
		"涼花みなせさんの音声ボタンで、好きな声をいつでも楽しもう。YouTube動画の特定場面を再生する音声ボタンを検索・再生・お気に入り登録できます。あーたたちが作った音声ボタンを見つけよう。",
	keywords: [
		"涼花みなせ",
		"音声ボタン",
		"検索",
		"再生",
		"お気に入り",
		"YouTube",
		"タイムスタンプ再生",
		"あーたたち",
	],
	openGraph: {
		title: "音声ボタン一覧 | すずみなくりっく！",
		description:
			"涼花みなせさんの音声ボタンで、好きな声をいつでも楽しもう。YouTube動画の特定場面を再生する音声ボタンを検索・再生・お気に入り登録できます。",
		url: "https://suzumina.click/buttons",
	},
	alternates: {
		canonical: "/buttons",
	},
};
