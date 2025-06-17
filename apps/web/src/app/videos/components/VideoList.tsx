"use client";

import Pagination from "@/components/Pagination";
import type { VideoListResult } from "@suzumina.click/shared-types/src/video";
import { useState } from "react";
import VideoCard from "./VideoCard";

interface VideoListProps {
  data: VideoListResult;
  totalCount: number;
  currentPage: number;
}

export default function VideoList({
  data,
  totalCount,
  currentPage,
}: VideoListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const itemsPerPage = 12;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // 検索機能は将来実装
      console.log("Search:", searchQuery);
    }
  };

  return (
    <div>
      {/* 検索・フィルター パネル */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="動画タイトルで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-suzuka-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-suzuka-500 hover:text-suzuka-600"
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
          <div className="flex gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-suzuka-500 focus:border-transparent"
            >
              <option value="">並び順</option>
              <option value="newest">新しい順</option>
              <option value="oldest">古い順</option>
              <option value="popular">人気順</option>
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-suzuka-500 focus:border-transparent"
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          動画一覧 (全{totalCount.toLocaleString()}件)
        </h2>
        <div className="text-sm text-gray-600">
          {currentPage}ページ / {totalPages}ページ
        </div>
      </div>

      {/* 動画一覧 */}
      {data.videos.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 mb-4 text-gray-300">
            <svg
              fill="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Video player icon"
            >
              <path d="M21,3H3C1.89,3 1,3.89 1,5V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V5C23,3.89 22.1,3 21,3M21,19H3V5H21V19Z" />
              <path d="M10,15L15.19,12L10,9V15Z" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg">動画が見つかりませんでした</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              buttonCount={0} // 将来的にaudioClipsコレクションから取得
              variant="grid"
            />
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
      {data.videos.length > 0 && (
        <div className="mt-6 text-sm text-gray-500 text-center">
          {totalCount.toLocaleString()}件中{" "}
          {((currentPage - 1) * itemsPerPage + 1).toLocaleString()}〜
          {Math.min(currentPage * itemsPerPage, totalCount).toLocaleString()}
          件を表示
        </div>
      )}
    </div>
  );
}
