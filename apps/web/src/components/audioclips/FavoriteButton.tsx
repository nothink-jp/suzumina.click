"use client";

import {
  checkFavoriteStatus,
  toggleFavorite,
} from "@/lib/audioclips/favorites";
import type { AudioClip } from "@/lib/audioclips/types";
import { useAuth } from "@/lib/firebase/auth";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface FavoriteButtonProps {
  clip: AudioClip;
  className?: string;
  showCount?: boolean;
  onToggle?: (isFavorite: boolean) => void;
}

/**
 * 音声クリップのお気に入りボタンコンポーネント
 * ログインしていない場合はログイン促進UIを表示
 * ログイン済みの場合はお気に入り登録/解除をトグルできる
 */
export default function FavoriteButton({
  clip,
  className = "",
  showCount = true,
  onToggle,
}: FavoriteButtonProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [favoriteCount, setFavoriteCount] = useState<number>(
    clip.favoriteCount || 0,
  );

  // ログインユーザーのお気に入り状態を初期化
  useEffect(() => {
    const initFavoriteStatus = async () => {
      if (user && clip && clip.id) {
        const status = await checkFavoriteStatus(user.uid, clip.id);
        setIsFavorite(status);
      } else {
        setIsFavorite(false);
      }
    };

    if (!loading) {
      initFavoriteStatus();
    }
  }, [user, clip, loading]);

  // お気に入りトグルハンドラー
  const handleToggleFavorite = useCallback(async () => {
    if (!user) {
      // 未ログインの場合、ログインページに誘導
      router.push(
        "/login?redirect=back&message=お気に入り機能を使うにはログインが必要です",
      );
      return;
    }

    if (loading || isLoading || !clip) return;

    try {
      setIsLoading(true);
      const newStatus = await toggleFavorite(user.uid, clip);
      setIsFavorite(newStatus);

      // お気に入り数の表示を更新
      setFavoriteCount((prevCount) =>
        newStatus ? prevCount + 1 : Math.max(0, prevCount - 1),
      );

      // 親コンポーネントにトグル状態を通知
      if (onToggle) {
        onToggle(newStatus);
      }
    } catch (error) {
      console.error("お気に入り処理エラー:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, loading, isLoading, clip, router, onToggle]);

  return (
    <button
      type="button"
      className={`btn btn-sm gap-2 transition-all ${
        isFavorite
          ? "btn-primary text-primary-content"
          : "btn-outline btn-primary"
      } ${isLoading ? "loading btn-disabled" : ""} ${className}`}
      onClick={handleToggleFavorite}
      disabled={isLoading}
      aria-label={isFavorite ? "お気に入りから削除" : "お気に入りに追加"}
      title={isFavorite ? "お気に入りから削除" : "お気に入りに追加"}
    >
      <Heart
        className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`}
        aria-hidden="true"
      />
      {showCount && <span className="text-xs">{favoriteCount}</span>}
    </button>
  );
}
