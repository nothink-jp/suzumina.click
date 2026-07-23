"use client";

import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { ConfigurableList, EmptyState } from "@suzumina.click/ui/components/custom";
import { SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ListWrapper } from "@/components/list/list-wrapper";
import {
	DEFAULT_ITEMS_PER_PAGE_OPTIONS,
	DEFAULT_LIST_PROPS,
	GRID_COLUMNS_4,
	VIDEO_SORT_OPTIONS,
} from "@/constants/list-options";
import { getPopularVideoTags, getVideosList } from "../actions";
import VideoCard from "./video-card";

interface VideoListProps {
	initialData: {
		items: VideoPlainObject[];
		totalCount: number;
		filteredCount: number;
	};
}

export default function VideoList({ initialData }: VideoListProps) {
	// タグ絞り込み用の人気タグ（playlistTags）。取得失敗してもUIは動作する。
	const [availableTags, setAvailableTags] = useState<Array<{ value: string; label: string }>>([]);

	useEffect(() => {
		const fetchTags = async () => {
			try {
				const tags = await getPopularVideoTags(30);
				setAvailableTags(tags.map((t) => ({ value: t.tag, label: `${t.tag} (${t.count})` })));
			} catch {
				// タグ取得に失敗しても他のフィルタ・検索は動作するため握りつぶす
			}
		};
		void fetchTags();
	}, []);

	// 年代選択肢を生成（2018年から現在年まで）
	const yearOptions = useMemo(() => {
		const currentYear = new Date().getFullYear();
		const years = [];
		for (let year = currentYear; year >= 2018; year--) {
			years.push({
				value: year.toString(),
				label: `${year}年`,
			});
		}
		return years;
	}, []);

	// レンダリング設定
	// 先頭 2 件のみ priority。6 件は preload 並列で帯域競合 + TBT regression
	// リスクがあり、LCP element は実測上いつも先頭 1 件目のため過剰。
	const renderItem = (video: VideoPlainObject, index: number) => (
		<VideoCard video={video} variant="grid" priority={index < 2} />
	);

	return (
		<ListWrapper>
			<ConfigurableList<VideoPlainObject>
				items={initialData.items}
				initialTotal={initialData.totalCount}
				renderItem={renderItem}
				listHeading="動画一覧"
				fetchFn={getVideosList as (params: unknown) => Promise<unknown>}
				{...DEFAULT_LIST_PROPS}
				layout="grid"
				gridColumns={GRID_COLUMNS_4}
				sorts={VIDEO_SORT_OPTIONS}
				filters={{
					year: {
						type: "select",
						label: "年代",
						placeholder: "年代を選択",
						options: yearOptions,
						showAll: true,
						emptyValue: "all",
					},
					videoType: {
						type: "select",
						label: "動画種別",
						placeholder: "動画種別を選択",
						options: [
							{ value: "live_archive", label: "配信アーカイブ" },
							{ value: "premiere", label: "プレミア公開" },
							{ value: "regular", label: "通常動画" },
							{ value: "live_upcoming", label: "配信中・配信予定" },
						],
						showAll: true,
						emptyValue: "all",
					},
					// key は playlistTags 固定: dataAdapter なしのため params.filters.playlistTags が
					// そのまま getVideosList に渡り、filterVideos の playlistTags フィルタが処理する。
					// 候補タグが無い間（取得前・取得失敗）はフィルタ自体を出さない。
					...(availableTags.length > 0
						? {
								playlistTags: {
									type: "tags" as const,
									label: "タグ",
									placeholder: "タグを選択",
									options: availableTags,
								},
							}
						: {}),
				}}
				itemsPerPageOptions={DEFAULT_ITEMS_PER_PAGE_OPTIONS}
				emptyMessage="動画がありません"
				emptyState={<EmptyState icon={<SearchX className="h-6 w-6" />} title="動画がありません" />}
			/>
		</ListWrapper>
	);
}
