import type { VideoListResult } from "@suzumina.click/shared-types/src/video";
import Pagination from "./Pagination";
import ThumbnailImage from "./ThumbnailImage";

interface VideoListProps {
  data: VideoListResult;
  totalCount: number;
  currentPage: number;
}

// Server Component版のVideoList
export default function VideoList({
  data,
  totalCount,
  currentPage,
}: VideoListProps) {
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div>
      {/* 動画一覧ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          動画一覧 (全{totalCount}件)
        </h2>
        <div className="text-sm text-gray-600">
          {currentPage}ページ / {totalPages}ページ
        </div>
      </div>

      {/* 動画一覧 */}
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

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}
