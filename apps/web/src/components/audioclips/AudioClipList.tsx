"use client";

import { getAudioClips } from "@/actions/audioclips/actions";
import { checkFavoriteStatus as checkFavoriteStatusAction } from "@/actions/audioclips/manage-favorites";
import { useEffect, useState } from "react";
import type { YouTubePlayer } from "../../components/videos/YouTubeEmbed";
import type { AudioClip } from "../../lib/audioclips/types";
import { useAuth } from "../../lib/firebase/AuthProvider";
import AudioClipButton from "./AudioClipButton";
import AudioClipPlayer from "./AudioClipPlayer";

interface AudioClipListProps {
  videoId: string;
  youtubePlayerRef?: React.RefObject<YouTubePlayer>;
}

/**
 * Server Actionから返されるクリップデータの型定義
 * 必要なプロパティのみ定義
 */
interface ServerActionClipData {
  id?: string;
  videoId?: string;
  title?: string;
  phrase?: string;
  startTime?: number;
  endTime?: number;
  audioUrl?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  userId?: string;
  userName?: string;
  userPhotoURL?: string;
  isPublic?: boolean;
  tags?: string[];
  playCount?: number;
  favoriteCount?: number;
  duration?: number;
  formattedDuration?: string;
}

/**
 * 音声クリップ一覧コンポーネント
 *
 * 特定の動画に関連する音声クリップの一覧を表示
 */
export default function AudioClipList({
  videoId,
  youtubePlayerRef,
}: AudioClipListProps) {
  const { user } = useAuth();
  const [clips, setClips] = useState<AudioClip[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [lastClip, setLastClip] = useState<AudioClip | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClip, setSelectedClip] = useState<AudioClip | null>(null);
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});

  // 初回読み込み
  useEffect(() => {
    loadClips();
  }, []);

  // ユーザーが変更されたらお気に入り状態を更新
  useEffect(() => {
    if (user && clips.length > 0) {
      updateFavoriteStatuses();
    }
  }, [user, clips]);

  // 再生時間をフォーマットするヘルパー関数
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // APIから返されたクリップデータをAudioClip型に変換するヘルパー関数
  const convertToAudioClip = (clip: ServerActionClipData): AudioClip => {
    // 安全にプロパティにアクセス
    const startTime = typeof clip.startTime === "number" ? clip.startTime : 0;
    const endTime = typeof clip.endTime === "number" ? clip.endTime : 0;
    const calculatedDuration = endTime - startTime;

    return {
      id: clip.id || "",
      videoId: clip.videoId || "",
      title: clip.title || "",
      phrase: clip.phrase || "",
      startTime: startTime,
      endTime: endTime,
      audioUrl: clip.audioUrl,
      createdAt: new Date(clip.createdAt || Date.now()),
      updatedAt: new Date(clip.updatedAt || Date.now()),
      userId: clip.userId || "",
      userName: clip.userName || "",
      userPhotoURL: clip.userPhotoURL,
      isPublic: Boolean(clip.isPublic),
      tags: clip.tags || [],
      playCount: typeof clip.playCount === "number" ? clip.playCount : 0,
      favoriteCount:
        typeof clip.favoriteCount === "number" ? clip.favoriteCount : 0,
      duration:
        typeof clip.duration === "number" ? clip.duration : calculatedDuration,
      formattedDuration:
        clip.formattedDuration || formatDuration(calculatedDuration),
    };
  };

  // クリップを読み込む
  const loadClips = async (isLoadMore = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // 初回読み込みの場合はリセット
      if (!isLoadMore) {
        setClips([]);
        setLastClip(undefined);
      }

      // Server Actionsを使用してクリップ一覧を取得
      const result = await getAudioClips({
        videoId,
        limit: 10,
        startAfter:
          isLoadMore && lastClip ? new Date(lastClip.createdAt) : null,
      });

      // データ変換: Server Actionの結果をアプリケーションのAudioClip型に変換
      const processedClips = result.clips.map(convertToAudioClip);

      // 型の安全性を保証したデータを設定
      setClips((prevClips) =>
        isLoadMore ? [...prevClips, ...processedClips] : processedClips,
      );

      // 最後のクリップとhasMoreフラグを設定
      setHasMore(result.hasMore);
      setLastClip(
        result.lastClip ? convertToAudioClip(result.lastClip) : undefined,
      );

      // ユーザーがログインしている場合はお気に入り状態を取得
      if (user) {
        updateFavoriteStatuses(processedClips);
      }
    } catch (error) {
      console.error("音声クリップの取得に失敗しました:", error);
      setError("音声クリップの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  // お気に入り状態を更新
  const updateFavoriteStatuses = async (clipsToCheck = clips) => {
    if (!user || clipsToCheck.length === 0) return;

    try {
      const favoriteStatuses: Record<string, boolean> = {};

      // 各クリップのお気に入り状態を取得
      await Promise.all(
        clipsToCheck.map(async (clip) => {
          const result = await checkFavoriteStatusAction(clip.id);
          favoriteStatuses[clip.id] = result.isFavorite;
        }),
      );

      setFavoriteMap((prev) => ({ ...prev, ...favoriteStatuses }));
    } catch (error) {
      console.error("お気に入り状態の取得に失敗しました:", error);
    }
  };

  // クリップ再生時の処理
  const handlePlayClip = (clip: AudioClip) => {
    setSelectedClip(clip);
  };

  // プレーヤーを閉じる
  const handleClosePlayer = () => {
    setSelectedClip(null);
  };

  // お気に入り状態変更時の処理
  const handleFavoriteChange = (clipId: string, isFavorite: boolean) => {
    setFavoriteMap((prev) => ({
      ...prev,
      [clipId]: isFavorite,
    }));
  };

  // もっと見るボタンクリック時の処理
  const handleLoadMore = () => {
    loadClips(true);
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-4">音声クリップ</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {clips.length === 0 && !isLoading ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            この動画の音声クリップはまだありません
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {clips.map((clip) => (
            <AudioClipButton
              key={clip.id}
              clip={clip}
              onPlay={handlePlayClip}
              isFavorite={favoriteMap[clip.id] || false}
              onFavoriteChange={(isFavorite) =>
                handleFavoriteChange(clip.id, isFavorite)
              }
            />
          ))}

          {hasMore && (
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
              >
                {isLoading ? "読み込み中..." : "もっと見る"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 音声クリッププレーヤー */}
      <AudioClipPlayer
        clip={selectedClip}
        onClose={handleClosePlayer}
        youtubePlayerRef={youtubePlayerRef}
      />
    </div>
  );
}
