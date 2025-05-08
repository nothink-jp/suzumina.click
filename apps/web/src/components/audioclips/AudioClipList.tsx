"use client";

import { useEffect, useRef, useState } from "react";
import type { FetchResult } from "../../actions/audioclips/types";
import type { AudioClip } from "../../lib/audioclips/types";
import { useAuth } from "../../lib/firebase/AuthProvider";
import AudioClipButton from "./AudioClipButton";
import AudioClipPlayer from "./AudioClipPlayer";

// GetAudioClipsParamsの型を定義 - VideoPageClientと一致させる
interface GetAudioClipsParams {
  videoId: string;
  limit?: number;
  lastClip?: AudioClip | null;
}

interface AudioClipListProps {
  videoId: string;
  initialClips: AudioClip[];
  hasMore: boolean;
  lastClip?: AudioClip | null;
  initialFavorites?: Record<string, boolean>;
  // Server Actions
  getAudioClipsAction: (params: GetAudioClipsParams) => Promise<FetchResult>;
  checkFavoriteStatusAction: (
    clipId: string,
    userId?: string,
  ) => Promise<boolean>;
  incrementPlayCountAction: (clipId: string) => Promise<void>;
  toggleFavoriteAction: (clipId: string, userId: string) => Promise<void>;
}

/**
 * 音声クリップリストコンポーネント
 *
 * 動画ページ内で音声クリップのリストを表示し、再生や無限スクロールを処理する
 * コンポーネント設計ガイドラインに従い、Server Actionsはprops経由で受け取る
 */
export default function AudioClipList({
  videoId,
  initialClips,
  hasMore: initialHasMore,
  lastClip: initialLastClip,
  initialFavorites = {},
  getAudioClipsAction,
  checkFavoriteStatusAction,
  incrementPlayCountAction,
  toggleFavoriteAction,
}: AudioClipListProps) {
  const { user } = useAuth();
  // 音声クリップ関連の状態
  const [clips, setClips] = useState<AudioClip[]>(initialClips);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [lastClip, setLastClip] = useState(initialLastClip);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] =
    useState<Record<string, boolean>>(initialFavorites);
  const [error, setError] = useState<string | null>(null);

  // 再生関連の状態
  const [currentClip, setCurrentClip] = useState<AudioClip | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(false);

  // 無限スクロール用のref
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // お気に入り状態の初期化（ログイン時のみ）
  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      if (!user || clips.length === 0) return;

      try {
        // ユーザーIDがある場合のみチェック
        if (user.uid) {
          // クリップごとに個別にお気に入り状態を確認
          const promises = clips.map((clip) =>
            checkFavoriteStatusAction(clip.id, user.uid),
          );

          const results = await Promise.all(promises);

          // 結果をオブジェクトにマッピング
          const newFavorites: Record<string, boolean> = {};
          clips.forEach((clip, index) => {
            newFavorites[clip.id] = results[index];
          });

          setFavorites((prev) => ({ ...prev, ...newFavorites }));
        }
      } catch (error) {
        setError("お気に入り状態の取得に失敗しました");
        console.error("お気に入り状態の取得に失敗しました:", error);
      }
    };

    // 初期お気に入りが空の場合のみ取得
    if (user && Object.keys(favorites).length === 0) {
      fetchFavoriteStatus();
    }
  }, [user, clips, favorites, checkFavoriteStatusAction]);

  // 無限スクロール
  useEffect(() => {
    // 監視対象の要素が画面に入ったときのコールバック
    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading) {
        loadMoreClips();
      }
    };

    // Intersection Observerの設定
    const option = {
      root: null,
      rootMargin: "20px",
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver(handleObserver, option);

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    // クリーンアップ関数
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading]);

  // クリップの追加読み込み
  const loadMoreClips = async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // props経由で受け取ったServer Actionを使用してデータを取得
      const result = await getAudioClipsAction({
        videoId,
        limit: 10,
        lastClip: lastClip,
      });

      if (result.clips.length > 0) {
        // 新しいクリップを追加
        setClips((prevClips) => [...prevClips, ...result.clips]);
        setLastClip(result.lastClip);
      }

      setHasMore(result.hasMore);

      // ログインしている場合、新しく読み込んだクリップのお気に入り状態を取得
      if (user && result.clips.length > 0 && user.uid) {
        // クリップごとに個別にお気に入り状態を確認
        const promises = result.clips.map((clip) =>
          checkFavoriteStatusAction(clip.id, user.uid),
        );

        const favResults = await Promise.all(promises);

        // 結果をオブジェクトにマッピング
        const newFavorites: Record<string, boolean> = {};
        result.clips.forEach((clip, index) => {
          newFavorites[clip.id] = favResults[index];
        });

        setFavorites((prev) => ({ ...prev, ...newFavorites }));
      }
    } catch (error) {
      setError("クリップの読み込みに失敗しました");
      console.error("クリップの読み込みに失敗しました:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // クリップ再生時の処理
  const handlePlay = (clip: AudioClip) => {
    setCurrentClip(clip);
    setIsPlaying(true);
    setPlayerVisible(true);
  };

  // お気に入り変更時の処理
  const handleFavoriteChange = (clipId: string, isFavorite: boolean) => {
    setFavorites((prev) => ({
      ...prev,
      [clipId]: isFavorite,
    }));
  };

  return (
    <div className="space-y-3">
      {/* ヘッダー部分 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-700">音声クリップ</h2>
        {/* クリップ数表示 */}
        <span className="text-sm text-gray-500">
          {clips.length}件 {hasMore && "以上"}
        </span>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="alert alert-error p-2 text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* クリップリスト */}
      {clips.length > 0 ? (
        <div className="space-y-3">
          {clips.map((clip) => (
            <AudioClipButton
              key={clip.id}
              clip={clip}
              onPlay={handlePlay}
              isFavorite={favorites[clip.id] || false}
              onFavoriteChange={(isFavorite) =>
                handleFavoriteChange(clip.id, isFavorite)
              }
              incrementPlayCountAction={incrementPlayCountAction}
              toggleFavoriteAction={toggleFavoriteAction}
            />
          ))}

          {/* 読み込み中表示とIntersection Observer用の要素 */}
          <div ref={loadingRef} className="py-4 text-center">
            {isLoading ? (
              <span className="loading loading-spinner loading-sm mr-2" />
            ) : hasMore ? (
              <span className="text-sm text-gray-500">
                スクロールして続きを表示
              </span>
            ) : null}
          </div>
        </div>
      ) : isLoading ? (
        <div className="text-center py-6">
          <span className="loading loading-spinner loading-sm mr-2" />
          <span className="text-gray-500">読み込み中...</span>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-500">
            この動画にはまだ音声クリップがありません
          </p>
        </div>
      )}

      {/* 音声プレーヤー */}
      {playerVisible && currentClip && (
        <AudioClipPlayer
          clip={currentClip}
          isPlaying={isPlaying}
          onPlayingChange={setIsPlaying}
          onClose={() => setPlayerVisible(false)}
        />
      )}
    </div>
  );
}
