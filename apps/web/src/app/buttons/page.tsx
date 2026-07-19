import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom";
import { Suspense } from "react";
import type { AudioButtonQuery } from "@/types/audio-button";
import { getAudioButtonsList } from "./actions";
import AudioButtonsList from "./components/audio-buttons-list";
import { type ButtonsView, ButtonsViewNav } from "./components/buttons-view-nav";
import { FeaturedAudioButtons } from "./components/featured-audio-buttons";
import { GroupedButtonsView } from "./components/grouped-buttons-view";
import { groupByUsageTag, groupByVideo } from "./lib/group-buttons";

interface SearchParams {
	q?: string;
	category?: string;
	tags?: string;
	sort?: string;
	page?: string;
	limit?: string;
	videoId?: string;
	/** 表示切替（すべて/用途別/動画ごと・SPR-257） */
	view?: string;
	// 高度フィルタパラメータ
	playCountMin?: string;
	playCountMax?: string;
	likeCountMin?: string;
	likeCountMax?: string;
	favoriteCountMin?: string;
	favoriteCountMax?: string;
	createdAfter?: string;
	createdBefore?: string;
	creatorId?: string;
}

/** グループビューが一度に扱う取得上限（本番80件・in-memory 基盤のため一括取得で足りる） */
const GROUP_FETCH_LIMIT = 200;
/** グループカードごとの表示上限（超過分は「もっと見る」へ誘導） */
const GROUP_DISPLAY_CAP = 10;

function parseView(view: string | undefined): ButtonsView {
	return view === "usage" || view === "video" ? view : "all";
}

/** featured（よく押されてる/新着）を出すか＝絞り込み・ページ送りのない素の一覧のみ */
function isUnfiltered(params: SearchParams): boolean {
	const filterKeys: Array<keyof SearchParams> = [
		"q",
		"tags",
		"videoId",
		"creatorId",
		"playCountMin",
		"playCountMax",
		"likeCountMin",
		"likeCountMax",
		"favoriteCountMin",
		"favoriteCountMax",
		"createdAfter",
		"createdBefore",
	];
	if (filterKeys.some((key) => params[key])) return false;
	return !params.page || Number(params.page) <= 1;
}

// タグパラメータをパースする関数（複雑度を下げるため分離）
function parseTags(tagsParam: string | undefined): string[] | undefined {
	if (!tagsParam) return undefined;

	// Next.jsのsearchParamsは既にデコード済みの値を提供
	if (tagsParam.includes("|")) {
		// 新形式: パイプ区切り
		return tagsParam.split("|").filter(Boolean);
	}
	if (tagsParam.includes(",") && !tagsParam.includes(" ")) {
		// 旧形式: カンマ区切り（スペースを含まない場合のみ）
		return tagsParam.split(",").filter(Boolean);
	}
	// 単一の値（スペースを含む可能性がある）
	return [tagsParam];
}

interface AudioButtonsPageProps {
	searchParams: Promise<SearchParams>;
}

/** 用途別/動画ごとビュー（全件を1回取得して in-memory グルーピング） */
async function GroupedView({ view }: { view: "usage" | "video" }) {
	const result = await getAudioButtonsList({
		sortBy: "newest",
		page: 1,
		limit: GROUP_FETCH_LIMIT,
	});
	const buttons = result.success && result.data ? result.data.audioButtons : [];
	const groups =
		view === "usage"
			? groupByUsageTag(buttons, GROUP_DISPLAY_CAP)
			: groupByVideo(buttons, GROUP_DISPLAY_CAP);

	return (
		<GroupedButtonsView
			heading={view === "usage" ? "用途別のボタン" : "動画ごとのボタン"}
			totalCount={buttons.length}
			groups={groups}
		/>
	);
}

/** featured セクション（よく押されてる4件 + 新着6件） */
async function FeaturedSection() {
	const [popularResult, freshResult] = await Promise.all([
		getAudioButtonsList({ sortBy: "mostPlayed", page: 1, limit: 4 }),
		getAudioButtonsList({ sortBy: "newest", page: 1, limit: 6 }),
	]);
	return (
		<FeaturedAudioButtons
			popular={popularResult.success && popularResult.data ? popularResult.data.audioButtons : []}
			fresh={freshResult.success && freshResult.data ? freshResult.data.audioButtons : []}
		/>
	);
}

export default async function AudioButtonsPage({ searchParams }: AudioButtonsPageProps) {
	const resolvedSearchParams = await searchParams;
	const view = parseView(resolvedSearchParams.view);
	const showFeatured = isUnfiltered(resolvedSearchParams);

	// limitパラメータの処理（デフォルト: 12）
	const limitValue = resolvedSearchParams.limit ? Number(resolvedSearchParams.limit) : 12;
	const validLimit = [12, 24, 48].includes(limitValue) ? limitValue : 12;

	// タグパラメータの処理
	const tags = parseTags(resolvedSearchParams.tags);

	// クエリパラメータを構築
	const query: AudioButtonQuery = {
		search: resolvedSearchParams.q,
		tags,
		sortBy: (resolvedSearchParams.sort as AudioButtonQuery["sortBy"]) || "newest",
		page: resolvedSearchParams.page ? Number(resolvedSearchParams.page) : 1,
		videoId: resolvedSearchParams.videoId,
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
		createdBy: resolvedSearchParams.creatorId,
		limit: validLimit,
	};

	// 初期データを取得（Server Component最適化・「すべて」ビューのみ）
	const initialData = view === "all" ? await getAudioButtonsList(query) : undefined;

	const listFallback = (
		<div className="text-center py-12">
			<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			<p className="mt-2 text-muted-foreground">読み込み中...</p>
		</div>
	);

	return (
		<ListPageLayout>
			<ListPageHeader
				title="音声ボタン一覧"
				description="涼花みなせさんの音声ボタンで、好きな声をいつでも楽しもう"
			/>

			<ListPageContent>
				<ButtonsViewNav currentView={view} activeTags={tags} />

				{showFeatured && (
					<Suspense fallback={null}>
						<FeaturedSection />
					</Suspense>
				)}

				{view === "all" ? (
					<Suspense fallback={listFallback}>
						<AudioButtonsList searchParams={resolvedSearchParams} initialData={initialData} />
					</Suspense>
				) : (
					<Suspense fallback={listFallback}>
						<GroupedView view={view} />
					</Suspense>
				)}
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
