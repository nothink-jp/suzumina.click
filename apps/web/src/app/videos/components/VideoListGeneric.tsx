"use client";

import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { GenericList, type ListConfig } from "@suzumina.click/ui/components/custom/generic-list";
import { getYouTubeCategoryName } from "@suzumina.click/ui/lib/youtube-category-utils";
import { useMemo } from "react";
import { fetchVideosForGenericList } from "../actions";
import VideoCard from "./VideoCard";

interface VideoListGenericProps {
	initialData: {
		items: VideoPlainObject[];
		totalCount: number;
		filteredCount: number;
	};
}

export default function VideoListGeneric({ initialData }: VideoListGenericProps) {
	// 年代選択肢を動的に生成（2018年から現在年まで）
	const currentYear = new Date().getFullYear();
	const yearOptions = useMemo(() => {
		const years = [];
		for (let year = currentYear; year >= 2018; year--) {
			years.push({
				value: year.toString(),
				label: `${year}年`,
			});
		}
		return years;
	}, [currentYear]);

	// GenericList設定
	const config: ListConfig = useMemo(
		() => ({
			baseUrl: "/videos",
			filters: [
				{
					key: "year",
					type: "select",
					label: "年代",
					options: [{ value: "all", label: "すべての年代" }, ...yearOptions],
					defaultValue: "all",
				},
				{
					key: "categoryNames",
					type: "select",
					label: "カテゴリ",
					options: [
						{ value: "all", label: "すべてのカテゴリ" },
						{ value: "ゲーム", label: "ゲーム" },
						{ value: "エンターテインメント", label: "エンターテインメント" },
						{ value: "音楽", label: "音楽" },
					],
					defaultValue: "all",
				},
				{
					key: "videoType",
					type: "select",
					label: "動画種別",
					options: [
						{ value: "all", label: "すべての動画" },
						{ value: "live_archive", label: "配信アーカイブ" },
						{ value: "premiere", label: "プレミア公開" },
						{ value: "regular", label: "通常動画" },
						{ value: "live_upcoming", label: "配信中・配信予定" },
					],
					defaultValue: "all",
				},
			],
			sorts: [
				{ value: "newest", label: "新しい順" },
				{ value: "oldest", label: "古い順" },
			],
			defaultSort: "newest",
			searchConfig: {
				placeholder: "動画タイトルで検索...",
				debounceMs: 300,
			},
			paginationConfig: {
				itemsPerPage: 12,
				itemsPerPageOptions: [12, 24, 48],
			},
			urlParamMapping: {
				year: "year",
				categoryNames: "categoryNames",
				videoType: "videoType",
			},
		}),
		[yearOptions],
	);

	// レンダリング設定
	const renderItem = (video: VideoPlainObject, index: number) => (
		<div key={video.id} className="min-h-video-card">
			<VideoCard
				video={video}
				variant="grid"
				priority={index < 6} // 最初の6枚をLCP最適化
			/>
		</div>
	);

	// 空状態のカスタマイズ
	const emptyStateProps = {
		icon: "PlayCircle",
		title: "動画が見つかりませんでした",
		description: "検索条件を変更してみてください。",
	};

	return (
		<GenericList
			config={config}
			fetchData={fetchVideosForGenericList}
			renderItem={renderItem}
			emptyStateProps={emptyStateProps}
			listTitle="動画一覧"
			initialData={initialData}
		/>
	);
}
