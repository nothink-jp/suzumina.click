"use client";

import { getVideoTitles } from "@/app/actions";
import type { VideoListResult } from "@suzumina.click/shared-types/src/video";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@suzumina.click/ui/components/pagination";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import ThumbnailImage from "./ThumbnailImage";

interface VideoListProps {
  initialData: VideoListResult;
  initialTotalCount: number;
  initialPage: number;
}

export default function VideoList({
  initialData,
  initialTotalCount,
  initialPage,
}: VideoListProps) {
  const [data, setData] = useState(initialData);
  const [totalCount] = useState(initialTotalCount);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePageChange = async (page: number) => {
    if (page === currentPage || loading) return;

    setLoading(true);

    try {
      // URL更新
      const params = new URLSearchParams(searchParams);
      params.set("page", page.toString());
      router.push(`?${params.toString()}`);

      // データ取得
      const result = await getVideoTitles({ page, limit: itemsPerPage });
      setData(result);
      setCurrentPage(page);

      // スクロールをトップに戻す
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error fetching page:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* ローディング状態 */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      )}

      {/* 動画一覧 */}
      <div className={`space-y-4 ${loading ? "opacity-50" : ""}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            動画一覧 (全{totalCount}件)
          </h2>
          <div className="text-sm text-gray-600">
            {currentPage}ページ / {totalPages}ページ
          </div>
        </div>

        {data.videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">動画が見つかりませんでした</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {data.videos.map((video) => (
              <div
                key={video.id}
                className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <ThumbnailImage
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-32 h-24 object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {video.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      チャンネル: {video.channelTitle}
                    </p>
                    <p className="text-sm text-gray-500">
                      公開日:{" "}
                      {new Date(video.publishedAt).toLocaleDateString("ja-JP")}
                    </p>
                    {video.description && (
                      <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                        {video.description.slice(0, 150)}
                        {video.description.length > 150 && "..."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) {
                      handlePageChange(currentPage - 1);
                    }
                  }}
                  className={
                    currentPage <= 1 ? "opacity-50 cursor-not-allowed" : ""
                  }
                />
              </PaginationItem>

              {/* 最初のページ */}
              {(() => {
                const maxVisiblePages = 5;
                const startPage = Math.max(
                  1,
                  currentPage - Math.floor(maxVisiblePages / 2),
                );
                const endPage = Math.min(
                  totalPages,
                  startPage + maxVisiblePages - 1,
                );
                const adjustedStartPage = Math.max(
                  1,
                  endPage - maxVisiblePages + 1,
                );

                const visiblePages = [];
                for (let i = adjustedStartPage; i <= endPage; i++) {
                  visiblePages.push(i);
                }

                return (
                  <>
                    {visiblePages.length > 0 &&
                      visiblePages[0] !== undefined &&
                      visiblePages[0] > 1 && (
                        <>
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(1);
                              }}
                            >
                              1
                            </PaginationLink>
                          </PaginationItem>
                          {visiblePages[0] > 2 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                        </>
                      )}

                    {/* ページ番号 */}
                    {visiblePages.map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={page === currentPage}
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(page);
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    {/* 最後のページ */}
                    {(() => {
                      const lastPage = visiblePages[visiblePages.length - 1];
                      return (
                        visiblePages.length > 0 &&
                        lastPage !== undefined &&
                        lastPage < totalPages && (
                          <>
                            {lastPage < totalPages - 1 && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePageChange(totalPages);
                                }}
                              >
                                {totalPages}
                              </PaginationLink>
                            </PaginationItem>
                          </>
                        )
                      );
                    })()}
                  </>
                );
              })()}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages && data.hasMore) {
                      handlePageChange(currentPage + 1);
                    }
                  }}
                  className={
                    currentPage >= totalPages || !data.hasMore
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
