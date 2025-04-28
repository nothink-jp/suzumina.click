"use client";

import AudioClipCreator from "@/components/audioclips/AudioClipCreator";
import AudioClipList from "@/components/audioclips/AudioClipList";
import VideoInfo from "@/components/videos/VideoInfo";
import YouTubeEmbed, {
  type YouTubePlayer,
} from "@/components/videos/YouTubeEmbed";
import type { Video } from "@/lib/videos/types";
import Link from "next/link";
import { useRef, useState } from "react";

interface VideoPageClientProps {
  video: Video;
}

/**
 * 動画詳細ページのクライアントコンポーネント
 *
 * YouTubeプレーヤーと音声クリップ機能を統合
 */
export default function VideoPageClient({ video }: VideoPageClientProps) {
  // YouTubeプレーヤーへの参照
  const youtubePlayerRef = useRef<YouTubePlayer>(
    null as unknown as YouTubePlayer,
  );

  // YouTubeプレーヤーの準備完了状態
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // YouTubeプレーヤーの参照を設定
  const handlePlayerReady = (player: YouTubePlayer) => {
    youtubePlayerRef.current = player;
    setIsPlayerReady(true);
  };

  // クリップ作成後の処理
  const handleClipCreated = () => {
    // クリップリストを更新
    setRefreshKey((prev) => prev + 1);
  };

  // クリップリストの更新用キー
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/" className="btn btn-ghost">
          ← 動画一覧に戻る
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* YouTube動画プレイヤー */}
          <YouTubeEmbed
            videoId={video.id}
            title={video.title}
            onReady={handlePlayerReady}
          />

          {/* 動画情報 */}
          <div className="mt-6">
            <VideoInfo video={video} />
          </div>

          {/* 音声クリップ作成フォーム */}
          {isPlayerReady && (
            <div className="mt-6">
              <AudioClipCreator
                videoId={video.id}
                videoTitle={video.title}
                onClipCreated={handleClipCreated}
                youtubePlayerRef={youtubePlayerRef}
              />
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          {/* 音声クリップ一覧 */}
          <AudioClipList
            key={refreshKey}
            videoId={video.id}
            youtubePlayerRef={youtubePlayerRef}
          />
        </div>
      </div>
    </main>
  );
}
