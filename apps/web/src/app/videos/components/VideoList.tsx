"use client";

import type { VideoListResult } from "@suzumina.click/shared-types/src/video";
import { ListHeader } from "@suzumina.click/ui/components/custom/list-header";
import {
	ListPageEmptyState,
	ListPageGrid,
	ListPageStats,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import {
	FilterSelect,
	SearchFilterPanel,
	SortSelect,
} from "@suzumina.click/ui/components/custom/search-filter-panel";
import { PlayCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import Pagination from "@/components/Pagination";
import VideoCard from "./VideoCard";

interface VideoListProps {
	data: VideoListResult;
	totalCount: number;
	filteredCount?: number;
	currentPage: number;
}

export default function VideoList({
	data,
	totalCount,
	filteredCount,
	currentPage,
}: VideoListProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState("default");
	const [yearFilter, setYearFilter] = useState(searchParams.get("year") || "all");

	const itemsPerPage = 12;
	const displayCount = filteredCount !== undefined ? filteredCount : totalCount;
	const totalPages = Math.ceil(displayCount / itemsPerPage);

	// 年代選択肢を動的に生成（2018年から現在年まで）
	const currentYear = new Date().getFullYear();
	const yearOptions = useMemo(() => {
		const years = [];
		for (let year = currentYear; year >= 2018; year--) {
			years.push(year);
		}
		return years;
	}, [currentYear]);

	// 年代フィルターの変更をURLに反映
	const handleYearChange = (year: string) => {
		setYearFilter(year);
		const params = new URLSearchParams(searchParams.toString());

		if (year && year !== "all") {
			params.set("year", year);
		} else {
			params.delete("year");
		}

		// ページ番号をリセット
		params.delete("page");

		// URLを更新（ページ再読み込み）
		router.push(`/videos?${params.toString()}`);
	};

	// FID改善: startTransition で非緊急更新を遅延
	const handleSearch = () => {
		if (searchQuery.trim()) {
			startTransition(() => {
				// 将来的に検索機能を実装予定
			});
		}
	};

	// FID改善: 検索・フィルタリング結果をメモ化
	const filteredVideos = useMemo(() => {
		// 現在は全て表示、将来的にフィルタリングロジックを追加
		return data.videos;
	}, [data.videos]);

	return (
		<div>
			{/* 検索・フィルター */}
			<SearchFilterPanel
				searchValue={searchQuery}
				onSearchChange={(value) => {
					// FID改善: 入力遅延で重い処理を避ける
					startTransition(() => {
						setSearchQuery(value);
					});
				}}
				onSearch={handleSearch}
				searchPlaceholder="動画タイトルで検索..."
				filters={
					<>
						<SortSelect
							value={sortBy}
							onValueChange={(value) => {
								// FID改善: 選択変更も遅延処理
								startTransition(() => {
									setSortBy(value);
								});
							}}
							options={[
								{ value: "default", label: "並び順" },
								{ value: "newest", label: "新しい順" },
								{ value: "oldest", label: "古い順" },
								{ value: "popular", label: "人気順" },
							]}
						/>
						<FilterSelect
							value={yearFilter}
							onValueChange={handleYearChange}
							placeholder="すべての年代"
							options={[
								{ value: "all", label: "すべての年代" },
								...yearOptions.map((year) => ({
									value: year.toString(),
									label: `${year}年`,
								})),
							]}
						/>
					</>
				}
			/>

			{/* ヘッダー */}
			<ListHeader
				title="動画一覧"
				totalCount={totalCount}
				filteredCount={filteredCount}
				currentPage={currentPage}
				totalPages={totalPages}
			/>

			{/* 動画一覧 */}
			{filteredVideos.length === 0 ? (
				<ListPageEmptyState
					icon={<PlayCircle className="mx-auto h-12 w-12" />}
					title="動画が見つかりませんでした"
				/>
			) : (
				<ListPageGrid>
					{filteredVideos.map((video, index) => (
						<div key={video.id} className="min-h-video-card">
							<VideoCard
								video={video}
								buttonCount={0} // 将来的にaudioClipsコレクションから取得
								variant="grid"
								priority={index < 6} // 最初の6枚をLCP最適化
							/>
						</div>
					))}
				</ListPageGrid>
			)}

			{/* ページネーション */}
			{totalPages > 1 && (
				<div className="mt-8">
					<Pagination currentPage={currentPage} totalPages={totalPages} />
				</div>
			)}

			{/* 統計情報 */}
			{filteredVideos.length > 0 && (
				<ListPageStats
					currentPage={currentPage}
					totalPages={totalPages}
					totalCount={displayCount}
					itemsPerPage={itemsPerPage}
				/>
			)}
		</div>
	);
}
