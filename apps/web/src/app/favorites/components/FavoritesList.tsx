"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
import { useCallback, useMemo } from "react";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";
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
			toParams: (params: StandardListParams) => ({
				page: params.page,
				limit: params.itemsPerPage || 20,
				sort: params.sort || "newest",
				userId,
			}),
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
				<AudioButtonWithPlayCount
					audioButton={audioButton}
					showFavorite={true}
					maxTitleLength={50}
					className="shadow-sm hover:shadow-md transition-all duration-200"
					initialIsFavorited={true}
					initialIsLiked={likeDislikeStatus.isLiked}
					initialIsDisliked={likeDislikeStatus.isDisliked}
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
			itemsPerPage: 20,
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
			urlSync
			layout="flex"
			sorts={[
				{ value: "newest", label: "新しい順" },
				{ value: "oldest", label: "古い順" },
			]}
			defaultSort="newest"
			itemsPerPageOptions={[20, 40, 60]}
			emptyMessage="お気に入りがまだありません。音声ボタンをお気に入りに追加すると、ここに表示されます"
		/>
	);
}
