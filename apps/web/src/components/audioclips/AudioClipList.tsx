import { useEffect, useState } from "react";
import type { YouTubePlayer } from "../../components/videos/YouTubeEmbed";
import {
  checkFavoriteStatus,
  getAudioClipsByVideo,
} from "../../lib/audioclips/api";
import type {
  AudioClip,
  AudioClipSearchParams,
} from "../../lib/audioclips/types";
import { useAuth } from "../../lib/firebase/AuthProvider";
import AudioClipButton from "./AudioClipButton";
import AudioClipPlayer from "./AudioClipPlayer";

interface AudioClipListProps {
  videoId: string;
  youtubePlayerRef?: React.RefObject<YouTubePlayer>;
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

  // クリップを読み込む
  const loadClips = async (isLoadMore = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const params: AudioClipSearchParams = {
        videoId: videoId, // 明示的にvideoIdを使用
        limit: 10,
      };

      // 「もっと見る」の場合は最後のクリップ以降を取得
      if (isLoadMore && lastClip) {
        params.startAfter = lastClip.createdAt;
      } else if (!isLoadMore) {
        // 初回読み込みの場合はリセット
        setClips([]);
        setLastClip(undefined);
      }

      const result = await getAudioClipsByVideo(params);

      setClips((prevClips) =>
        isLoadMore ? [...prevClips, ...result.clips] : result.clips,
      );
      setHasMore(result.hasMore);
      setLastClip(result.lastClip);

      // ユーザーがログインしている場合はお気に入り状態を取得
      if (user) {
        updateFavoriteStatuses(result.clips);
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
          const isFavorite = await checkFavoriteStatus(clip.id, user.uid);
          favoriteStatuses[clip.id] = isFavorite;
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
