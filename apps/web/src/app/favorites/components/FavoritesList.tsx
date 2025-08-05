"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Heart, Music } from "lucide-react";
import Link from "next/link";
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
					extra: { likeDislikeStatuses: data.likeDislikeStatuses },
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

	// レンダリング関数
	const renderItem = useCallback(
		(
			audioButton: AudioButtonPlainObject,
			_: number,
			extra?: { likeDislikeStatuses?: Record<string, { isLiked: boolean; isDisliked: boolean }> },
		) => {
			const likeDislikeStatus = extra?.likeDislikeStatuses?.[audioButton.id];

			return (
				<AudioButtonWithPlayCount
					audioButton={audioButton}
					showFavorite={true}
					maxTitleLength={50}
					className="shadow-sm hover:shadow-md transition-all duration-200"
					initialIsFavorited={true}
					initialIsLiked={likeDislikeStatus?.isLiked || false}
					initialIsDisliked={likeDislikeStatus?.isDisliked || false}
				/>
			);
		},
		[],
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

	// 空状態のコンポーネント
	const emptyComponent = (
		<div className="flex flex-col items-center justify-center py-12">
			<Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
			<h3 className="text-lg font-semibold mb-2">お気に入りがまだありません</h3>
			<p className="text-muted-foreground mb-4">
				音声ボタンをお気に入りに追加すると、ここに表示されます
			</p>
			<Button asChild>
				<Link href="/buttons">
					<Music className="h-4 w-4 mr-2" />
					音声ボタン一覧へ
				</Link>
			</Button>
		</div>
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
			flexOptions={{
				wrap: true,
				gap: 3,
				justify: "start",
			}}
			sortOptions={[
				{ value: "newest", label: "新しい順" },
				{ value: "oldest", label: "古い順" },
			]}
			defaultSort="newest"
			itemsPerPageOptions={[20, 40, 60]}
			emptyMessage={emptyComponent}
			extra={{ likeDislikeStatuses: initialData.likeDislikeStatuses }}
		/>
	);
}
