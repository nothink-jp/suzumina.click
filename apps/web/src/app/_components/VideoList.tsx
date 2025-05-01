"use client";

import VideoCard from "@/components/ui/VideoCard";
import { getRecentVideos } from "@/lib/videos/api";
import type { Video, VideoListResult, VideoType } from "@/lib/videos/types";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

/**
 * 動画一覧コンポーネント
 * 最新の動画を一覧表示し、「もっと見る」ボタンでさらに読み込む
 */
export interface VideoListProps {
  /** 表示する動画の最大数（指定しない場合は制限なし） */
  limit?: number;
  /** 「もっと見る」ボタンの代わりに全一覧ページへのリンクを表示するかどうか */
  showViewAllLink?: boolean;
  /** 一度に読み込む動画数 */
  pageSize?: number;
  /** デフォルトの動画タイプフィルタ */
  defaultVideoType?: VideoType;
}

export default function VideoList({
  limit,
  showViewAllLink = false,
  pageSize = 12,
  defaultVideoType = "all",
}: VideoListProps) {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [lastVideo, setLastVideo] = useState<Video | undefined>(undefined);
  // 動画タイプフィルタの状態
  const [videoType, setVideoType] = useState<VideoType>(defaultVideoType);

  // フィルタが変更された時、または初回読み込み時に動画を取得
  useEffect(() => {
    loadVideos(true);
  }, []);

  // 動画を読み込む関数
  async function loadVideos(reset = false) {
    setLoading(true);
    try {
      const result = await getRecentVideos({
        limit: pageSize,
        // startAfterパラメータはDate型で渡す
        // undefinedの場合は渡さない
        startAfter:
          reset || !lastVideo
            ? undefined
            : // publishedAtISOがある場合はそれを使用し、なければpublishedAtを使用
              lastVideo.publishedAtISO
              ? dayjs(lastVideo.publishedAtISO).toDate()
              : lastVideo.publishedAt instanceof Date
                ? lastVideo.publishedAt
                : undefined,
        // 動画タイプフィルタを追加
        videoType: videoType === "all" ? undefined : videoType,
      });

      // 新しい動画リストを作成（limitが指定されている場合は制限する）
      setVideos((prevVideos) => {
        const newVideos = reset
          ? result.videos
          : [...prevVideos, ...result.videos];
        return limit ? newVideos.slice(0, limit) : newVideos;
      });
      setHasMore(result.hasMore);
      setLastVideo(result.lastVideo);
    } catch (error) {
      console.error("動画の読み込みに失敗しました:", error);
    } finally {
      setLoading(false);
    }
  }

  // もっと見るボタンのクリックハンドラ
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadVideos();
    }
  };

  // フィルタの変更ハンドラ
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVideoType = e.target.value;
    if (["all", "archived", "upcoming"].includes(newVideoType)) {
      setVideoType(newVideoType as VideoType);
      // フィルタ変更時に即座に動画を再読み込み
      loadVideos(true);
    } else {
      console.warn("Invalid video type:", newVideoType);
    }
  };

  // 配信状態によって動画リストに表示するヘッダーテキストを変更
  const getFilterHeader = () => {
    switch (videoType) {
      case "archived":
        return "配信済み動画";
      case "upcoming":
        return "配信予定";
      default:
        return "すべての動画";
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <h2 className="text-2xl font-bold">{getFilterHeader()}</h2>

        {/* 動画フィルタプルダウン */}
        <div className="form-control">
          <select
            className="select select-bordered"
            value={videoType}
            onChange={handleFilterChange}
            aria-label="動画の表示フィルタ"
          >
            <option value="all">すべての動画</option>
            <option value="archived">配信済み動画のみ</option>
            <option value="upcoming">配信予定のみ</option>
          </select>
        </div>
      </div>

      {/* 動画がない場合 */}
      {videos.length === 0 && !loading && (
        <div className="text-center py-12">
          <p>
            {videoType === "upcoming"
              ? "配信予定の動画はありません"
              : videoType === "archived"
                ? "配信済みの動画はありません"
                : "動画がありません"}
          </p>
        </div>
      )}

      {/* 動画グリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {/* ローディング表示 */}
      {loading && (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {/* もっと見るボタンまたは全一覧へのリンク */}
      {!loading && videos.length > 0 && (
        <div className="mt-8 flex justify-end">
          {showViewAllLink ? (
            <a href={`/videos?type=${videoType}`} className="btn btn-primary">
              もっと見る
            </a>
          ) : (
            hasMore && (
              <button
                onClick={handleLoadMore}
                className="btn btn-primary"
                type="button"
              >
                もっと見る
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
