import type { AudioButtonQuery } from "@suzumina.click/shared-types";
import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { Suspense } from "react";
import { getAudioButtons } from "./actions";
import AudioButtonsList from "./components/AudioButtonsList";

interface SearchParams {
	q?: string;
	category?: string;
	tags?: string;
	sort?: string;
	page?: string;
	limit?: string;
	sourceVideoId?: string;
	// 高度フィルタパラメータ
	playCountMin?: string;
	playCountMax?: string;
	likeCountMin?: string;
	likeCountMax?: string;
	favoriteCountMin?: string;
	favoriteCountMax?: string;
	createdAfter?: string;
	createdBefore?: string;
	createdBy?: string;
}

interface AudioButtonsPageProps {
	searchParams: Promise<SearchParams>;
}

export default async function AudioButtonsPage({ searchParams }: AudioButtonsPageProps) {
	const resolvedSearchParams = await searchParams;

	// limitパラメータの処理（デフォルト: 12）
	const limitValue = resolvedSearchParams.limit ? Number(resolvedSearchParams.limit) : 12;
	const validLimit = [12, 24, 48].includes(limitValue) ? limitValue : 12;

	// クエリパラメータを構築
	const query: AudioButtonQuery = {
		search: resolvedSearchParams.q,
		tags: resolvedSearchParams.tags?.split(",").filter(Boolean),
		sortBy: (resolvedSearchParams.sort as AudioButtonQuery["sortBy"]) || "newest",
		page: resolvedSearchParams.page ? Number(resolvedSearchParams.page) : 1,
		sourceVideoId: resolvedSearchParams.sourceVideoId,
		// 高度フィルタ
		playCountMin: resolvedSearchParams.playCountMin
			? Number(resolvedSearchParams.playCountMin)
			: undefined,
		playCountMax: resolvedSearchParams.playCountMax
			? Number(resolvedSearchParams.playCountMax)
			: undefined,
		likeCountMin: resolvedSearchParams.likeCountMin
			? Number(resolvedSearchParams.likeCountMin)
			: undefined,
		likeCountMax: resolvedSearchParams.likeCountMax
			? Number(resolvedSearchParams.likeCountMax)
			: undefined,
		favoriteCountMin: resolvedSearchParams.favoriteCountMin
			? Number(resolvedSearchParams.favoriteCountMin)
			: undefined,
		favoriteCountMax: resolvedSearchParams.favoriteCountMax
			? Number(resolvedSearchParams.favoriteCountMax)
			: undefined,
		createdAfter: resolvedSearchParams.createdAfter,
		createdBefore: resolvedSearchParams.createdBefore,
		createdBy: resolvedSearchParams.createdBy,
		limit: validLimit,
	};

	// 初期データを取得（Server Component最適化）
	const initialData = await getAudioButtons(query);

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
					<AudioButtonsList searchParams={resolvedSearchParams} initialData={initialData} />
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
