"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { ConfigurableList, EmptyState } from "@suzumina.click/ui/components/custom";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { AudioButtonListItem } from "@/components/audio/audio-button-list-item";
import {
	BASIC_SORT_OPTIONS,
	DEFAULT_ITEMS_PER_PAGE_OPTIONS,
	DEFAULT_LIST_PROPS,
} from "@/constants/list-options";
import { createBasicToParams } from "@/utils/list-adapters";
import { getFavoritesList } from "../actions";

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
				const data = result as Awaited<ReturnType<typeof getFavoritesList>>;
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
		const typedParams = params as Parameters<typeof getFavoritesList>[0];
		return getFavoritesList(typedParams);
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
			emptyMessage="お気に入りがまだありません"
			emptyState={
				<EmptyState
					icon={<Heart className="h-6 w-6" />}
					title="お気に入りがまだありません"
					description="音声ボタンをお気に入りに追加すると、ここに表示されます"
					action={<Button render={<Link href="/buttons">音声ボタン一覧を見る</Link>} />}
				/>
			}
		/>
	);
}
