"use client";

import type { AudioButtonPlainObject, AudioButtonQuery } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
import { useMemo } from "react";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";
import { useFavoriteStatusBulk } from "@/hooks/useFavoriteStatusBulk";
import { useLikeDislikeStatusBulk } from "@/hooks/useLikeDislikeStatusBulk";
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

// 音声ボタン表示用のコンポーネント
function AudioButtonItem({
	audioButton,
	searchQuery,
	isFavorited,
	isLiked,
	isDisliked,
}: {
	audioButton: AudioButtonPlainObject;
	searchQuery?: string;
	isFavorited: boolean;
	isLiked: boolean;
	isDisliked: boolean;
}) {
	return (
		<AudioButtonWithPlayCount
			audioButton={audioButton}
			className="shadow-sm hover:shadow-md transition-all duration-200"
			searchQuery={searchQuery}
			highlightClassName="bg-suzuka-200 text-suzuka-900 px-0.5 rounded"
			initialIsFavorited={isFavorited}
			initialIsLiked={isLiked}
			initialIsDisliked={isDisliked}
		/>
	);
}

export default function AudioButtonsList({
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

	// 一時的な実装：お気に入り状態を管理
	const audioButtonIds = useMemo(() => {
		if (!transformedInitialData) return [];
		return transformedInitialData.items.map((button) => button.id);
	}, [transformedInitialData]);

	const { favoriteStates } = useFavoriteStatusBulk(audioButtonIds);
	const { likeDislikeStates } = useLikeDislikeStatusBulk(audioButtonIds);

	return (
		<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-6">
			<ConfigurableList<AudioButtonPlainObject>
				items={transformedInitialData?.items || []}
				initialTotal={transformedInitialData?.total || 0}
				renderItem={(audioButton) => {
					const likeDislikeStatus = likeDislikeStates.get(audioButton.id) || {
						isLiked: false,
						isDisliked: false,
					};
					return (
						<AudioButtonItem
							audioButton={audioButton}
							searchQuery={searchParams.q as string}
							isFavorited={favoriteStates.get(audioButton.id) || false}
							isLiked={likeDislikeStatus.isLiked}
							isDisliked={likeDislikeStatus.isDisliked}
						/>
					);
				}}
				fetchFn={async (params: unknown) => {
					const result = await getAudioButtons(params as AudioButtonQuery);
					if (!result.success || !result.data) {
						throw new Error("error" in result ? result.error : "Failed to fetch audio buttons");
					}
					return {
						items: result.data.audioButtons,
						total: result.data.totalCount,
					};
				}}
				dataAdapter={{
					toParams: (params) => {
						// ConfigurableListのStandardListParamsをAudioButtonQueryに変換
						const validSortOptions: readonly AudioButtonQuery["sortBy"][] = [
							"newest",
							"mostPlayed",
						];
						const sortBy: AudioButtonQuery["sortBy"] =
							params.sort && validSortOptions.includes(params.sort as AudioButtonQuery["sortBy"])
								? (params.sort as AudioButtonQuery["sortBy"])
								: "newest";

						const query: AudioButtonQuery = {
							search: params.search,
							sortBy,
							page: params.page,
							limit: params.itemsPerPage,
						};
						// フィルターがあれば追加
						if (params.filters.duration) {
							const range = params.filters.duration as { min?: number; max?: number };
							query.durationMin = range.min;
							query.durationMax = range.max;
						}
						return query;
					},
					fromResult: (result) => result as { items: AudioButtonPlainObject[]; total: number },
				}}
				searchable
				searchPlaceholder="音声ボタンを検索..."
				urlSync
				layout="flex"
				sorts={[
					{ value: "newest", label: "新しい順" },
					{ value: "mostPlayed", label: "再生回数順" },
				]}
				defaultSort="newest"
				itemsPerPageOptions={[12, 24, 48]}
			/>
		</div>
	);
}
