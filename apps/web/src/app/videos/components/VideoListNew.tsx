"use client";

import type { VideoPlainObject } from "@suzumina.click/shared-types";
import type { StandardListParams } from "@suzumina.click/ui/components/custom/list";
import { ConfigurableList, generateYearOptions } from "@suzumina.click/ui/components/custom/list";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { fetchVideosForGenericList } from "../actions";
import VideoCard from "./VideoCard";

interface VideoListNewProps {
	initialData: {
		items: VideoPlainObject[];
		totalCount: number;
		filteredCount: number;
	};
}

export default function VideoListNew({ initialData }: VideoListNewProps) {
	// URLパラメータを取得
	const searchParams = useSearchParams();
	const urlPageSize = Number(searchParams.get("itemsPerPage") || "12");

	// 初期データがURLのページサイズと一致しているか確認
	const adjustedInitialItems = useMemo(() => {
		console.log("[VideoListNew] Checking initial data:", {
			initialItemsLength: initialData.items.length,
			urlPageSize,
			willUseInitialData: initialData.items.length === urlPageSize,
		});

		// URLのページサイズと初期データのアイテム数が一致している場合はそのまま使用
		// 一致していない場合は空配列を返して再取得を促す
		if (initialData.items.length === urlPageSize) {
			return initialData.items;
		}
		// ページサイズが変更された場合は空配列を返して再取得を促す
		return [];
	}, [initialData.items, urlPageSize]);

	// 年代選択肢を動的に生成（2018年から現在年まで）
	const currentYear = new Date().getFullYear();
	const yearOptions = useMemo(() => generateYearOptions(2018, currentYear), [currentYear]);

	// フィルター設定
	const filters = useMemo(
		() => ({
			year: {
				type: "select" as const,
				options: yearOptions,
				showAll: true,
			},
			categoryNames: {
				type: "select" as const,
				options: [
					{ value: "ゲーム", label: "ゲーム" },
					{ value: "エンターテインメント", label: "エンターテインメント" },
					{ value: "音楽", label: "音楽" },
				],
				showAll: true,
			},
			videoType: {
				type: "select" as const,
				options: [
					{ value: "live_archive", label: "配信アーカイブ" },
					{ value: "premiere", label: "プレミア公開" },
					{ value: "regular", label: "通常動画" },
					{ value: "live_upcoming", label: "配信中・配信予定" },
				],
				showAll: true,
			},
		}),
		[yearOptions],
	);

	// ソート設定
	const sorts = [
		{ value: "newest", label: "新しい順" },
		{ value: "oldest", label: "古い順" },
	];

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

	// データアダプター
	const dataAdapter = {
		toParams: (params: StandardListParams) => ({
			page: params.page,
			limit: params.itemsPerPage,
			sort: params.sort || "newest",
			search: params.search,
			filters: {
				year: params.filters.year === "all" ? undefined : params.filters.year,
				categoryNames:
					params.filters.categoryNames === "all" ? undefined : params.filters.categoryNames,
				videoType: params.filters.videoType === "all" ? undefined : params.filters.videoType,
			},
		}),
		fromResult: (result: { items: VideoPlainObject[]; filteredCount: number }) => ({
			items: result.items,
			total: result.filteredCount,
		}),
	};

	return (
		<ConfigurableList
			items={adjustedInitialItems}
			renderItem={renderItem}
			filters={filters}
			sorts={sorts}
			defaultSort="newest"
			searchPlaceholder="動画タイトルで検索..."
			itemsPerPage={12}
			itemsPerPageOptions={[12, 24, 48]}
			fetchFn={fetchVideosForGenericList}
			dataAdapter={dataAdapter}
			emptyMessage="動画が見つかりませんでした。検索条件を変更してみてください。"
			layout="grid"
			gridColumns={{
				default: 1,
				md: 2,
				lg: 3,
			}}
		/>
	);
}
