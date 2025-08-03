"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
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

// 音声ボタン用のfetchData関数
async function fetchAudioButtons(
	params: StandardListParams,
): Promise<{ items: AudioButtonPlainObject[]; total: number }> {
	// 範囲フィルタの処理
	const playCountFilter = params.filters.playCount as { min?: number; max?: number } | undefined;
	const likeCountFilter = params.filters.likeCount as { min?: number; max?: number } | undefined;
	const favoriteCountFilter = params.filters.favoriteCount as
		| { min?: number; max?: number }
		| undefined;
	const durationFilter = params.filters.duration as { min?: number; max?: number } | undefined;

	// ConfigurableListのパラメータをgetAudioButtons用に変換
	const query = {
		page: params.page,
		limit: params.itemsPerPage,
		sortBy: (params.sort || "newest") as "newest" | "oldest" | "popular" | "mostPlayed",
		searchText: params.search,
		// 数値範囲フィルタ
		playCountMin: playCountFilter?.min,
		playCountMax: playCountFilter?.max,
		likeCountMin: likeCountFilter?.min,
		likeCountMax: likeCountFilter?.max,
		favoriteCountMin: favoriteCountFilter?.min,
		favoriteCountMax: favoriteCountFilter?.max,
		durationMin: durationFilter?.min,
		durationMax: durationFilter?.max,
		// その他
		onlyPublic: true,
	};

	const result = await getAudioButtons(query);

	if (result.success) {
		return {
			items: result.data.audioButtons,
			total: result.data.totalCount,
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
			total: initialData.data.totalCount,
			page: 1,
			itemsPerPage: initialData.data.audioButtons.length,
		};
	}, [initialData]);

	// sourceVideoIdがある場合のタイトル
	const title = searchParams.sourceVideoId ? "この動画の音声ボタン" : "音声ボタン一覧";

	// 一時的な実装：お気に入り状態を管理
	const audioButtonIds = useMemo(() => {
		if (!transformedInitialData) return [];
		return transformedInitialData.items.map((button) => button.id);
	}, [transformedInitialData]);

	const { favoriteStates } = useFavoriteStatusBulk(audioButtonIds);

	return (
		<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-6">
			<h1 className="text-2xl font-bold mb-6">{title}</h1>
			<ConfigurableList<AudioButtonPlainObject>
				items={transformedInitialData?.items || []}
				renderItem={(audioButton) => (
					<AudioButtonItem
						audioButton={audioButton}
						searchQuery={searchParams.q as string}
						isFavorited={favoriteStates.get(audioButton.id) || false}
					/>
				)}
				fetchFn={fetchAudioButtons as (params: unknown) => Promise<unknown>}
				dataAdapter={{
					toParams: (params) => params,
					fromResult: (result) => result as { items: AudioButtonPlainObject[]; total: number },
				}}
				searchable
				searchPlaceholder="音声ボタンを検索..."
				urlSync
				layout="flex"
				sorts={[
					{ value: "newest", label: "新しい順" },
					{ value: "oldest", label: "古い順" },
					{ value: "popular", label: "人気順" },
					{ value: "mostPlayed", label: "再生回数順" },
				]}
				defaultSort="newest"
				filters={{
					playCount: {
						type: "range",
						label: "再生数",
						min: 0,
						max: 10000,
						step: 100,
					},
					likeCount: {
						type: "range",
						label: "いいね数",
						min: 0,
						max: 1000,
						step: 10,
					},
					favoriteCount: {
						type: "range",
						label: "お気に入り数",
						min: 0,
						max: 1000,
						step: 10,
					},
					duration: {
						type: "range",
						label: "音声長",
						min: 0,
						max: 60,
						step: 1,
					},
				}}
				itemsPerPageOptions={[12, 24, 48]}
				initialTotal={transformedInitialData?.total}
			/>
		</div>
	);
}
