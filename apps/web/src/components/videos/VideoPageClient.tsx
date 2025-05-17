"use client";

import { createAudioClip } from "@/actions/audioclips/actions";
import type { FetchResult } from "@/actions/audioclips/types";
import AudioClipCreator from "@/components/audioclips/AudioClipCreator";
import AudioClipList from "@/components/audioclips/AudioClipList";
import CollapsibleVideoInfo from "@/components/videos/CollapsibleVideoInfo";
import YouTubeEmbed, {
  type YouTubePlayer,
} from "@/components/videos/YouTubeEmbed";
import type {
  AudioClipCreateData,
  OverlapCheckResult,
} from "@/lib/audioclips/types";
import { useAuth } from "@/lib/firebase/AuthProvider";
import type { Video } from "@/lib/videos/types";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// GetAudioClipsParamsの型を定義
interface GetAudioClipsParams {
  videoId: string;
  limit?: number;
  lastClip?: FetchResult["lastClip"];
}

interface VideoPageClientProps {
  video: Video;
  initialClipsData: FetchResult;
  // Server Actionsをprops経由で受け取る
  getAudioClipsAction: (params: GetAudioClipsParams) => Promise<FetchResult>;
  checkFavoriteStatusAction: (
    clipId: string,
    userId?: string,
  ) => Promise<boolean>;
  incrementPlayCountAction: (clipId: string) => Promise<void>;
  toggleFavoriteAction: (clipId: string) => Promise<void>;
  // 重複チェック用のサーバーアクション
  checkOverlapAction: (
    videoId: string,
    startTime: number,
    endTime: number,
    excludeClipId?: string,
  ) => Promise<OverlapCheckResult>;
}

/**
 * 動画詳細ページのクライアントコンポーネント
 *
 * YouTubeプレーヤーと音声クリップ機能を統合
 * コンポーネント設計ガイドラインに従い、サーバーアクションをクライアントコンポーネントに直接渡す
 */
export default function VideoPageClient({
  video,
  initialClipsData,
  getAudioClipsAction,
  checkFavoriteStatusAction,
  incrementPlayCountAction,
  toggleFavoriteAction,
  checkOverlapAction,
}: VideoPageClientProps) {
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

  // 認証状態のデバッグログ（開発環境のみ）
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

    // 開発環境でのみ最小限のデバッグ情報を表示
    if (process.env.NODE_ENV === "development") {
      console.log("YouTubeプレーヤーの準備完了");
    }

    setIsPlayerReady(true);
  };

  // クリップ作成をラップしてデバッグ情報を表示するためのハンドラー
  const handleCreateAudioClip = async (data: AudioClipCreateData) => {
    if (process.env.NODE_ENV === "development") {
      console.log("クライアント: 音声クリップ作成開始", {
        videoId: data.videoId,
        title: data.title,
        userId: user?.uid,
      });
    }

    try {
      const result = await createAudioClip(data);
      return result;
    } catch (error) {
      // 開発環境でのみエラーログを出力
      if (process.env.NODE_ENV === "development") {
        console.error("クリップ作成エラー:", error);
      }
      throw error;
    }
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
                createAudioClipAction={handleCreateAudioClip}
                checkOverlapAction={checkOverlapAction}
              />
            </div>
          )}

          {/* 音声クリップ一覧（モバイル版） */}
          <div className="lg:hidden">
            <AudioClipList
              key={refreshKey}
              videoId={video.id}
              initialClips={initialClipsData.clips}
              hasMore={initialClipsData.hasMore}
              lastClip={initialClipsData.lastClip}
              getAudioClipsAction={getAudioClipsAction}
              checkFavoriteStatusAction={checkFavoriteStatusAction}
              incrementPlayCountAction={incrementPlayCountAction}
              toggleFavoriteAction={toggleFavoriteAction}
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
                initialClips={initialClipsData.clips}
                hasMore={initialClipsData.hasMore}
                lastClip={initialClipsData.lastClip}
                getAudioClipsAction={getAudioClipsAction}
                checkFavoriteStatusAction={checkFavoriteStatusAction}
                incrementPlayCountAction={incrementPlayCountAction}
                toggleFavoriteAction={toggleFavoriteAction}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
