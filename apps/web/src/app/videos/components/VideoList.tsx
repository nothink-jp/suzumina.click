"use client";

import type { VideoListResult } from "@suzumina.click/shared-types/src/video";
import { startTransition, useMemo, useState } from "react";
import Pagination from "@/components/Pagination";
import VideoCard from "./VideoCard";

interface VideoListProps {
	data: VideoListResult;
	totalCount: number;
	currentPage: number;
}

export default function VideoList({ data, totalCount, currentPage }: VideoListProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState("");
	const [yearFilter, setYearFilter] = useState("");

	const itemsPerPage = 12;
	const totalPages = Math.ceil(totalCount / itemsPerPage);

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
			{/* 検索・フィルター パネル */}
			<div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-8">
				<div className="flex flex-col sm:flex-row gap-4">
					<div className="flex-1">
						<div className="relative">
							<input
								type="text"
								placeholder="動画タイトルで検索..."
								value={searchQuery}
								onChange={(e) => {
									// FID改善: 入力遅延で重い処理を避ける
									startTransition(() => {
										setSearchQuery(e.target.value);
									});
								}}
								onKeyDown={(e) => e.key === "Enter" && handleSearch()}
								className="w-full px-4 py-3 pr-10 border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent min-h-[44px]"
								// FID改善: passive listener で応答性向上
								style={{ touchAction: "manipulation" }}
							/>
							<button
								type="button"
								onClick={handleSearch}
								className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
								aria-label="検索"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>
							</button>
						</div>
					</div>
					<div className="flex flex-col sm:flex-row gap-4">
						<select
							value={sortBy}
							onChange={(e) => {
								// FID改善: 選択変更も遅延処理
								startTransition(() => {
									setSortBy(e.target.value);
								});
							}}
							className="px-4 py-3 border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent min-h-[44px]"
							style={{ touchAction: "manipulation" }}
						>
							<option value="">並び順</option>
							<option value="newest">新しい順</option>
							<option value="oldest">古い順</option>
							<option value="popular">人気順</option>
						</select>
						<select
							value={yearFilter}
							onChange={(e) => {
								// FID改善: 年代フィルタも遅延処理
								startTransition(() => {
									setYearFilter(e.target.value);
								});
							}}
							className="px-4 py-3 border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent min-h-[44px]"
							style={{ touchAction: "manipulation" }}
						>
							<option value="">年代</option>
							<option value="2024">2024年</option>
							<option value="2023">2023年</option>
							<option value="2022">2022年</option>
						</select>
					</div>
				</div>
			</div>

			{/* ヘッダー */}
			<div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-6 gap-2">
				<h2 className="text-lg sm:text-xl font-semibold text-foreground">
					動画一覧 (全{totalCount.toLocaleString()}件)
				</h2>
				<div className="text-sm text-muted-foreground">
					{currentPage}ページ / {totalPages}ページ
				</div>
			</div>

			{/* 動画一覧 */}
			{filteredVideos.length === 0 ? (
				<div className="text-center py-12">
					<div className="mx-auto w-24 h-24 mb-4 text-muted-foreground">
						<svg fill="currentColor" viewBox="0 0 24 24" role="img" aria-label="Video player icon">
							<path d="M21,3H3C1.89,3 1,3.89 1,5V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V5C23,3.89 22.1,3 21,3M21,19H3V5H21V19Z" />
							<path d="M10,15L15.19,12L10,9V15Z" />
						</svg>
					</div>
					<p className="text-muted-foreground text-lg">動画が見つかりませんでした</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredVideos.map((video, index) => (
						<div key={video.id} className="min-h-video-card">
							{" "}
							{/* CLS削減: 最小高さ予約 */}
							<VideoCard
								video={video}
								buttonCount={0} // 将来的にaudioClipsコレクションから取得
								variant="grid"
								priority={index < 6} // 最初の6枚をLCP最適化
							/>
						</div>
					))}
				</div>
			)}

			{/* ページネーション */}
			{totalPages > 1 && (
				<div className="mt-8">
					<Pagination currentPage={currentPage} totalPages={totalPages} />
				</div>
			)}

			{/* 統計情報 */}
			{filteredVideos.length > 0 && (
				<div className="mt-6 text-sm text-muted-foreground text-center">
					{totalCount.toLocaleString()}件中{" "}
					{((currentPage - 1) * itemsPerPage + 1).toLocaleString()}〜
					{Math.min(currentPage * itemsPerPage, totalCount).toLocaleString()}
					件を表示
				</div>
			)}
		</div>
	);
}
