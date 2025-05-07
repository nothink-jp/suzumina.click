"use client";

import { getAudioClips } from "@/actions/audioclips/actions";
import { checkFavoriteStatus as checkFavoriteStatusAction } from "@/actions/audioclips/manage-favorites";
import { useEffect, useState } from "react";
import type { YouTubePlayer } from "../../components/videos/YouTubeEmbed";
import type { AudioClip } from "../../lib/audioclips/types";
import { sanitizeClipForClient, toSafeDate } from "../../lib/audioclips/utils";
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
  audioUrl?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  userId?: string;
  userName?: string;
  userPhotoURL?: string | null;
  isPublic?: boolean;
  tags?: string[];
  playCount?: number;
  favoriteCount?: number;
  duration?: number;
  formattedDuration?: string;
  [key: string]: string | number | boolean | Date | null | string[] | undefined;
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
    try {
      console.log("変換前のクリップデータ:", clip);
      console.log(
        "変換前のクリップデータ型:",
        Object.keys(clip).map((key) => `${key}: ${typeof clip[key]}`),
      );

      // まず日付を安全な形式に変換
      const sanitized = sanitizeClipForClient(clip);
      console.log("sanitizeClipForClient後のデータ:", sanitized);

      // 安全にプロパティにアクセス
      const startTime =
        typeof sanitized.startTime === "number" ? sanitized.startTime : 0;
      const endTime =
        typeof sanitized.endTime === "number" ? sanitized.endTime : 0;
      const calculatedDuration = endTime - startTime;

      // 再生時間のフォーマット（例：1:30）
      const minutes = Math.floor(calculatedDuration / 60);
      const seconds = Math.floor(calculatedDuration % 60);
      const formattedDuration = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      // 型に合わせてデータを整形
      const result: AudioClip = {
        id: sanitized.id || "",
        videoId: sanitized.videoId || "",
        title: sanitized.title || "タイトルなし",
        phrase: sanitized.phrase || "",
        startTime,
        endTime,
        audioUrl: sanitized.audioUrl,
        // 日付は常に文字列として扱う - Date型の場合は文字列に変換
        createdAt:
          typeof sanitized.createdAt === "string"
            ? sanitized.createdAt
            : sanitized.createdAt instanceof Date
              ? sanitized.createdAt.toISOString()
              : new Date().toISOString(),
        updatedAt:
          typeof sanitized.updatedAt === "string"
            ? sanitized.updatedAt
            : sanitized.updatedAt instanceof Date
              ? sanitized.updatedAt.toISOString()
              : new Date().toISOString(),
        userId: sanitized.userId || "",
        userName: sanitized.userName || "名無しユーザー",
        userPhotoURL: sanitized.userPhotoURL,
        isPublic: !!sanitized.isPublic,
        tags: Array.isArray(sanitized.tags) ? sanitized.tags : [],
        playCount:
          typeof sanitized.playCount === "number" ? sanitized.playCount : 0,
        favoriteCount:
          typeof sanitized.favoriteCount === "number"
            ? sanitized.favoriteCount
            : 0,
        // lastPlayedAtもcreatedAtと同様に文字列型に統一
        lastPlayedAt:
          typeof sanitized.lastPlayedAt === "string"
            ? sanitized.lastPlayedAt
            : sanitized.lastPlayedAt instanceof Date
              ? sanitized.lastPlayedAt.toISOString()
              : undefined,
        duration: calculatedDuration,
        formattedDuration,
        isFavorited: false, // お気に入り状態は別途取得
      };

      console.log("変換後のクリップデータ:", result);
      return result;
    } catch (error) {
      console.error("クリップデータ変換中にエラーが発生しました:", error);
      console.error("問題のあるクリップデータ:", clip);

      // エラーが発生した場合は最小限のデータで応答
      return {
        id: typeof clip.id === "string" ? clip.id : "error-id",
        videoId: typeof clip.videoId === "string" ? clip.videoId : "",
        title: "データ変換エラー",
        phrase: "",
        startTime: 0,
        endTime: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: "",
        userName: "エラー",
        isPublic: true,
        tags: [],
        playCount: 0,
        favoriteCount: 0,
        duration: 0,
        formattedDuration: "0:00",
        isFavorited: false,
      };
    }
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

      // ページネーション用のstartAfterの処理
      let startAfterParam = null;
      if (isLoadMore && lastClip && lastClip.createdAt) {
        try {
          // 日付文字列を安全にDateオブジェクトに変換
          startAfterParam = new Date(lastClip.createdAt);
        } catch (error) {
          console.error("日付変換エラー:", error);
          // エラーが発生した場合はページネーションなしで続行
          startAfterParam = null;
        }
      }

      // Server Actionsを使用してクリップ一覧を取得
      const result = await getAudioClips({
        videoId,
        limit: 10,
        startAfter: startAfterParam,
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
    // clipはすでにAudioClip型なので、型変換する必要はない
    // ただし、最新の状態を保持するために参照をそのまま使う
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
