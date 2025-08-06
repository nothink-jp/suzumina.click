"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
import { useCallback, useMemo } from "react";
import { AudioButtonListItem } from "@/components/audio/AudioButtonListItem";
import {
	BASIC_SORT_OPTIONS,
	DEFAULT_ITEMS_PER_PAGE_OPTIONS,
	DEFAULT_LIST_PROPS,
} from "@/constants/list-options";
import { createBasicToParams } from "@/utils/list-adapters";
import { fetchFavoriteAudioButtons } from "../actions";

interface FavoritesListProps {
	initialData: {
		audioButtons: AudioButtonPlainObject[];
		totalCount: number;
		hasMore?: boolean;
		likeDislikeStatuses: Record<string, { isLiked: boolean; isDisliked: boolean }>;
	};
	userId: string;
}

export default function FavoritesList({ initialData, userId }: FavoritesListProps) {
	// データアダプター
	const dataAdapter = useMemo(
		() => ({
			toParams: createBasicToParams("newest", () => ({ userId })),
			fromResult: (result: unknown) => {
				const data = result as Awaited<ReturnType<typeof fetchFavoriteAudioButtons>>;
				return {
					items: data.audioButtons,
					total: data.totalCount,
				};
			},
		}),
		[userId],
	);

	// フェッチ関数
	const fetchFn = useCallback(async (params: unknown) => {
		const typedParams = params as Parameters<typeof fetchFavoriteAudioButtons>[0];
		return fetchFavoriteAudioButtons(typedParams);
	}, []);

	// 初期のいいね/低評価状態をMapに変換
	const initialLikeDislikeMap = useMemo(() => {
		const map = new Map<string, { isLiked: boolean; isDisliked: boolean }>();
		Object.entries(initialData.likeDislikeStatuses).forEach(([id, status]) => {
			map.set(id, status);
		});
		return map;
	}, [initialData.likeDislikeStatuses]);

	// レンダリング関数
	const renderItem = useCallback(
		(audioButton: AudioButtonPlainObject) => {
			const likeDislikeStatus = initialLikeDislikeMap.get(audioButton.id) || {
				isLiked: false,
				isDisliked: false,
			};

			return (
				<AudioButtonListItem
					audioButton={audioButton}
					isFavorited={true}
					isLiked={likeDislikeStatus.isLiked}
					isDisliked={likeDislikeStatus.isDisliked}
				/>
			);
		},
		[initialLikeDislikeMap],
	);

	// 初期データの変換
	const transformedInitialData = useMemo(
		() => ({
			items: initialData.audioButtons,
			total: initialData.totalCount,
			page: 1,
			itemsPerPage: DEFAULT_ITEMS_PER_PAGE_OPTIONS[0],
		}),
		[initialData],
	);

	return (
		<ConfigurableList<AudioButtonPlainObject>
			items={transformedInitialData.items}
			initialTotal={transformedInitialData.total}
			renderItem={renderItem}
			fetchFn={fetchFn}
			dataAdapter={dataAdapter}
			{...DEFAULT_LIST_PROPS}
			layout="flex"
			sorts={BASIC_SORT_OPTIONS}
			itemsPerPageOptions={DEFAULT_ITEMS_PER_PAGE_OPTIONS}
			emptyMessage="お気に入りがまだありません。音声ボタンをお気に入りに追加すると、ここに表示されます"
		/>
	);
}
