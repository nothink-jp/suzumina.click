"use client";

import type { AudioButtonPlainObject, AudioButtonQuery } from "@suzumina.click/shared-types";
import { ConfigurableList } from "@suzumina.click/ui/components/custom/list";
import { useEffect, useMemo, useState } from "react";
import { AudioButtonListItem } from "@/components/audio/AudioButtonListItem";
import { ListWrapper } from "@/components/list/ListWrapper";
import {
	AUDIO_SORT_OPTIONS,
	DEFAULT_ITEMS_PER_PAGE_OPTIONS,
	DEFAULT_LIST_PROPS,
} from "@/constants/list-options";
import { useFavoriteStatusBulk } from "@/hooks/useFavoriteStatusBulk";
import { useLikeDislikeStatusBulk } from "@/hooks/useLikeDislikeStatusBulk";
import { getAudioButtonsList, getPopularAudioButtonTags } from "../actions";

interface AudioButtonsListProps {
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

export default function AudioButtonsList({ searchParams, initialData }: AudioButtonsListProps) {
	const [availableTags, setAvailableTags] = useState<Array<{ value: string; label: string }>>([]);

	// 人気タグを取得
	useEffect(() => {
		const fetchTags = async () => {
			try {
				const tags = await getPopularAudioButtonTags(20); // 上位20タグを取得
				const formattedTags = tags.map((t) => ({
					value: t.tag,
					label: `${t.tag} (${t.count}件)`,
				}));
				setAvailableTags(formattedTags);
			} catch (error) {
				// タグの取得に失敗してもUIは動作可能
			}
		};
		fetchTags();
	}, []);

	// 初期データを準備
	const initialItems =
		initialData?.success && initialData.data ? initialData.data.audioButtons : [];
	const initialTotal = initialData?.success && initialData.data ? initialData.data.totalCount : 0;

	// 一時的な実装：お気に入り状態を管理
	const audioButtonIds = useMemo(() => {
		return initialItems.map((button) => button.id);
	}, [initialItems]);

	const { favoriteStates } = useFavoriteStatusBulk(audioButtonIds);
	const { likeDislikeStates } = useLikeDislikeStatusBulk(audioButtonIds);

	return (
		<ListWrapper>
			<ConfigurableList<AudioButtonPlainObject>
				items={initialItems}
				initialTotal={initialTotal}
				renderItem={(audioButton) => {
					const likeDislikeStatus = likeDislikeStates.get(audioButton.id) || {
						isLiked: false,
						isDisliked: false,
					};
					return (
						<AudioButtonListItem
							audioButton={audioButton}
							searchQuery={searchParams.q as string}
							isFavorited={favoriteStates.get(audioButton.id) || false}
							isLiked={likeDislikeStatus.isLiked}
							isDisliked={likeDislikeStatus.isDisliked}
						/>
					);
				}}
				fetchFn={async (params: unknown) => {
					const result = await getAudioButtonsList(params as AudioButtonQuery);
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

						return {
							search: params.search,
							tags: params.filters.tags as string[] | undefined,
							sortBy,
							page: params.page,
							limit: params.itemsPerPage,
						};
					},
					fromResult: (result) => result as { items: AudioButtonPlainObject[]; total: number },
				}}
				{...DEFAULT_LIST_PROPS}
				layout="flex"
				sorts={AUDIO_SORT_OPTIONS}
				filters={{
					tags: {
						type: "tags",
						label: "タグ",
						placeholder: "タグを選択",
						options: availableTags,
					},
				}}
				itemsPerPageOptions={DEFAULT_ITEMS_PER_PAGE_OPTIONS}
				emptyMessage="音声ボタンが見つかりませんでした"
			/>
		</ListWrapper>
	);
}
