"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import {
	GenericListCompat,
	type GenericListCompatProps,
} from "@suzumina.click/ui/components/custom/list/generic-list-compat";
import { useMemo } from "react";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";
import { useFavoriteStatusBulk } from "@/hooks/useFavoriteStatusBulk";
import { getAudioButtons } from "../actions";

interface AudioButtonsListGenericProps {
	searchParams:
		| Record<string, string | string[] | undefined>
		| {
				q?: string;
				category?: string;
				tags?: string;
				sort?: string;
				page?: string;
				limit?: string;
				sourceVideoId?: string;
				playCountMin?: string;
				playCountMax?: string;
				likeCountMin?: string;
				likeCountMax?: string;
				favoriteCountMin?: string;
				favoriteCountMax?: string;
				durationMin?: string;
				durationMax?: string;
				createdAfter?: string;
				createdBefore?: string;
				createdBy?: string;
		  };
	initialData?: {
		success: boolean;
		data?: {
			audioButtons: AudioButtonPlainObject[];
			totalCount: number;
			hasMore: boolean;
		};
		error?: string;
	};
}

// 音声ボタン用のfetchAdapter
async function fetchAudioButtonsAdapter(params: {
	page: number;
	limit: number;
	sort?: string;
	search?: string;
	filters: Record<string, unknown>;
}) {
	// GenericListのパラメータをgetAudioButtons用に変換
	const query = {
		page: params.page,
		limit: params.limit,
		sortBy: (params.sort || "newest") as "newest" | "oldest" | "popular" | "mostPlayed",
		searchText: params.search,
		tags: params.filters.tags
			? (params.filters.tags as string).split(",").filter(Boolean)
			: undefined,
		sourceVideoId: params.filters.sourceVideoId as string | undefined,
		// 数値範囲フィルタ
		playCountMin: params.filters.playCountMin ? Number(params.filters.playCountMin) : undefined,
		playCountMax: params.filters.playCountMax ? Number(params.filters.playCountMax) : undefined,
		likeCountMin: params.filters.likeCountMin ? Number(params.filters.likeCountMin) : undefined,
		likeCountMax: params.filters.likeCountMax ? Number(params.filters.likeCountMax) : undefined,
		favoriteCountMin: params.filters.favoriteCountMin
			? Number(params.filters.favoriteCountMin)
			: undefined,
		favoriteCountMax: params.filters.favoriteCountMax
			? Number(params.filters.favoriteCountMax)
			: undefined,
		durationMin: params.filters.durationMin ? Number(params.filters.durationMin) : undefined,
		durationMax: params.filters.durationMax ? Number(params.filters.durationMax) : undefined,
		// 日付範囲フィルタ
		createdAfter: params.filters.createdAfter as string | undefined,
		createdBefore: params.filters.createdBefore as string | undefined,
		// 作成者フィルタ
		createdBy: params.filters.createdBy as string | undefined,
	};

	const result = await getAudioButtons(query);

	if (result.success) {
		return {
			items: result.data.audioButtons,
			totalCount: result.data.totalCount,
			filteredCount: result.data.totalCount, // 現在のAPIでは同じ値
		};
	}

	throw new Error(result.error || "音声ボタンの取得に失敗しました");
}

// 音声ボタン表示用のコンポーネント
function AudioButtonItem({
	audioButton,
	searchQuery,
	isFavorited,
}: {
	audioButton: AudioButtonPlainObject;
	searchQuery?: string;
	isFavorited: boolean;
}) {
	return (
		<AudioButtonWithPlayCount
			audioButton={audioButton}
			className="shadow-sm hover:shadow-md transition-all duration-200"
			searchQuery={searchQuery}
			highlightClassName="bg-suzuka-200 text-suzuka-900 px-0.5 rounded"
			initialIsFavorited={isFavorited}
		/>
	);
}

export default function AudioButtonsListGeneric({
	searchParams,
	initialData,
}: AudioButtonsListGenericProps) {
	// 初期データの変換
	const transformedInitialData = useMemo(() => {
		if (!initialData || !initialData.success || !initialData.data) {
			return undefined;
		}
		return {
			items: initialData.data.audioButtons,
			totalCount: initialData.data.totalCount,
			filteredCount: initialData.data.totalCount,
		};
	}, [initialData]);

	// sourceVideoIdがある場合のタイトル
	const title = searchParams.sourceVideoId ? "この動画の音声ボタン" : "音声ボタン一覧";

	const config: GenericListCompatProps<AudioButtonPlainObject>["config"] = {
		title,
		baseUrl: "/buttons",
		filters: [], // 現在はフィルターなし、将来的に実装
		sorts: [
			{ value: "newest", label: "新しい順" },
			{ value: "oldest", label: "古い順" },
			{ value: "popular", label: "人気順" },
			{ value: "mostPlayed", label: "再生回数順" },
		],
		defaultSort: "newest",
		searchConfig: {
			placeholder: "音声ボタンを検索...",
			debounceMs: 300,
		},
		paginationConfig: {
			itemsPerPage: 12,
			itemsPerPageOptions: [12, 24, 48],
		},
		// フレックスボックスレイアウトを使用
		layout: "flex",
	};

	// 一時的な実装：お気に入り状態を管理
	const audioButtonIds = useMemo(() => {
		if (!transformedInitialData) return [];
		return transformedInitialData.items.map((button) => button.id);
	}, [transformedInitialData]);

	const { favoriteStates } = useFavoriteStatusBulk(audioButtonIds);

	return (
		<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-6">
			<GenericListCompat
				config={config}
				fetchData={fetchAudioButtonsAdapter}
				renderItem={(audioButton) => (
					<AudioButtonItem
						audioButton={audioButton}
						searchQuery={searchParams.q as string}
						isFavorited={favoriteStates.get(audioButton.id) || false}
					/>
				)}
				initialData={transformedInitialData}
			/>
		</div>
	);
}
