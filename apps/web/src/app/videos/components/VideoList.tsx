"use client";

import type { VideoPlainObject } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
import { useMemo } from "react";
import { ListWrapper } from "@/components/list/ListWrapper";
import {
	DEFAULT_ITEMS_PER_PAGE_OPTIONS,
	DEFAULT_LIST_PROPS,
	GRID_COLUMNS_3,
	VIDEO_SORT_OPTIONS,
} from "@/constants/list-options";
import { fetchVideosForConfigurableList } from "../actions";
import VideoCard from "./VideoCard";

interface VideoListProps {
	initialData: {
		items: VideoPlainObject[];
		totalCount: number;
		filteredCount: number;
	};
}

export default function VideoList({ initialData }: VideoListProps) {
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

	// 動画一覧用のfetchData関数
	async function fetchVideos(
		params: StandardListParams,
	): Promise<{ items: VideoPlainObject[]; total: number }> {
		// ConfigurableListのパラメータをfetchVideosForConfigurableList用に変換
		const query = {
			page: params.page,
			limit: params.itemsPerPage,
			sort: params.sort || "newest",
			search: params.search,
			filters: params.filters,
		};

		const result = await fetchVideosForConfigurableList(query);
		return {
			items: result.items,
			total: result.totalCount,
		};
	}

	// レンダリング設定
	const renderItem = (video: VideoPlainObject, index: number) => (
		<VideoCard
			video={video}
			variant="grid"
			priority={index < 6} // 最初の6枚をLCP最適化
		/>
	);

	return (
		<ListWrapper>
			<ConfigurableList<VideoPlainObject>
				items={initialData.items}
				initialTotal={initialData.totalCount}
				renderItem={renderItem}
				fetchFn={fetchVideos as (params: unknown) => Promise<unknown>}
				{...DEFAULT_LIST_PROPS}
				searchPlaceholder="動画タイトルで検索..."
				layout="grid"
				gridColumns={GRID_COLUMNS_3}
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
					categoryNames: {
						type: "select",
						label: "カテゴリ",
						placeholder: "カテゴリを選択",
						options: [
							{ value: "ゲーム", label: "ゲーム" },
							{ value: "エンターテインメント", label: "エンターテインメント" },
							{ value: "音楽", label: "音楽" },
						],
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
				}}
				itemsPerPageOptions={DEFAULT_ITEMS_PER_PAGE_OPTIONS}
				emptyMessage="動画がありません"
			/>
		</ListWrapper>
	);
}
