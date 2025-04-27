"use client";

import { useEffect, useState } from "react";
import VideoCard from "@/components/ui/VideoCard";
import { getRecentVideos } from "@/lib/videos/api";
import type { Video, VideoListResult } from "@/lib/videos/types";

/**
 * 動画一覧コンポーネント
 * 最新の動画を一覧表示し、「もっと見る」ボタンでさらに読み込む
 */
export default function VideoList() {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [lastVideo, setLastVideo] = useState<Video | undefined>(undefined);

  // 初回読み込み
  useEffect(() => {
    loadVideos();
  }, []);

  // 動画を読み込む関数
  async function loadVideos(reset = false) {
    setLoading(true);
    try {
      const result = await getRecentVideos({
        limit: 12,
        startAfter: reset ? undefined : lastVideo?.publishedAt
      });
      
      setVideos(prev => reset ? result.videos : [...prev, ...result.videos]);
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

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-6">最新動画</h2>
      
      {/* 動画がない場合 */}
      {videos.length === 0 && !loading && (
        <div className="text-center py-12">
          <p>動画がありません</p>
        </div>
      )}
      
      {/* 動画グリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {videos.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
      
      {/* ローディング表示 */}
      {loading && (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}
      
      {/* もっと見るボタン */}
      {hasMore && !loading && (
        <div className="text-center mt-8">
          <button
            onClick={handleLoadMore}
            className="btn btn-primary"
            type="button"
          >
            もっと見る
          </button>
        </div>
      )}
    </div>
  );
}