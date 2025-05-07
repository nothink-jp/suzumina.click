"use client";

import {
  createAudioClip,
  getAudioClips,
  incrementPlayCount,
} from "@/actions/audioclips/actions";
import {
  checkMultipleFavoriteStatus,
  toggleFavorite,
} from "@/actions/audioclips/manage-favorites";
import AudioClipCreator from "@/components/audioclips/AudioClipCreator";
import AudioClipList from "@/components/audioclips/AudioClipList";
import CollapsibleVideoInfo from "@/components/videos/CollapsibleVideoInfo";
import YouTubeEmbed, {
  type YouTubePlayer,
} from "@/components/videos/YouTubeEmbed";
import { useAuth } from "@/lib/firebase/AuthProvider";
import type { Video } from "@/lib/videos/types";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface VideoPageClientProps {
  video: Video;
}

/**
 * 動画詳細ページのクライアントコンポーネント
 *
 * YouTubeプレーヤーと音声クリップ機能を統合
 * コンポーネント設計ガイドラインに従い、サーバーアクションをクライアントコンポーネントに直接渡す
 */
export default function VideoPageClient({ video }: VideoPageClientProps) {
  // 認証情報を取得
  const { user } = useAuth();

  // YouTubeプレーヤーへの参照
  const youtubePlayerRef = useRef<YouTubePlayer>(
    null as unknown as YouTubePlayer,
  );

  // YouTubeプレーヤーの準備完了状態
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // クリップリストの更新用キー
  const [refreshKey, setRefreshKey] = useState(0);

  // 認証状態のデバッグログ（開発用）
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "VideoPageClient 認証状態:",
        user ? "ログイン済み" : "未ログイン",
      );
    }
  }, [user]);

  // YouTubeプレーヤーの参照を設定
  const handlePlayerReady = (player: YouTubePlayer) => {
    youtubePlayerRef.current = player;

    // 環境情報の取得
    const isCloudRun =
      typeof window !== "undefined" &&
      window.location.hostname.includes("run.app");

    // デバッグ情報（常に出力されるように変更）
    console.log("YouTubeプレーヤーの準備完了:", {
      isCloudRun,
      playerMethods: {
        getCurrentTime: typeof player.getCurrentTime === "function",
        seekTo: typeof player.seekTo === "function",
        playVideo: typeof player.playVideo === "function",
        pauseVideo: typeof player.pauseVideo === "function",
      },
    });

    // 現在時間が取得できるか試してみる（エラーハンドリングを強化）
    try {
      const currentTime = player.getCurrentTime();
      console.log("[デバッグ] 現在の再生位置:", currentTime);

      // より詳細な型情報も記録
      console.log(
        "[デバッグ] getCurrentTime()の戻り値の型:",
        typeof currentTime,
      );
      console.log(
        "[デバッグ] プレーヤーオブジェクトの完全な構造:",
        Object.getOwnPropertyNames(player),
      );
    } catch (error) {
      console.error("[エラー] 現在の再生位置の取得に失敗しました:", error);
      console.error("[エラー] エラースタック:", (error as Error).stack);
    }

    setIsPlayerReady(true);
  };

  // クリップ作成後の処理
  const handleClipCreated = () => {
    // クリップリストを更新
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="btn btn-ghost btn-sm gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="戻る"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          動画一覧に戻る
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2">
          {/* YouTube動画プレイヤー */}
          <div className="card bg-base-100 shadow-sm overflow-hidden mb-6">
            <div className="w-full">
              <YouTubeEmbed
                videoId={video.id}
                title={video.title}
                onReady={handlePlayerReady}
              />
            </div>
          </div>

          {/* 動画情報 */}
          <div className="mb-6">
            <CollapsibleVideoInfo video={video} />
          </div>

          {/* 音声クリップ作成フォーム */}
          {isPlayerReady && (
            <div className="mb-6">
              <AudioClipCreator
                videoId={video.id}
                videoTitle={video.title}
                onClipCreated={handleClipCreated}
                youtubePlayerRef={youtubePlayerRef}
                createAudioClipAction={createAudioClip}
              />
            </div>
          )}

          {/* 音声クリップ一覧（モバイル版） */}
          <div className="lg:hidden">
            <AudioClipList
              key={refreshKey}
              videoId={video.id}
              initialClips={[]}
              hasMore={true}
              getAudioClipsAction={getAudioClips}
              checkFavoriteStatusAction={checkMultipleFavoriteStatus}
              incrementPlayCountAction={incrementPlayCount}
              toggleFavoriteAction={toggleFavorite}
            />
          </div>
        </div>

        {/* サイドバー */}
        <div className="hidden lg:block">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <AudioClipList
                key={refreshKey}
                videoId={video.id}
                initialClips={[]}
                hasMore={true}
                getAudioClipsAction={getAudioClips}
                checkFavoriteStatusAction={checkMultipleFavoriteStatus}
                incrementPlayCountAction={incrementPlayCount}
                toggleFavoriteAction={toggleFavorite}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
