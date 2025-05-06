"use client";

import { incrementPlayCount } from "@/actions/audioclips/actions";
import { toggleFavorite } from "@/actions/audioclips/manage-favorites";
import { useState } from "react";
import type { AudioClip } from "../../lib/audioclips/types";
import { useAuth } from "../../lib/firebase/AuthProvider";
import TagDisplay from "./TagDisplay";

interface AudioClipButtonProps {
  clip: AudioClip;
  onPlay: (clip: AudioClip) => void;
  isFavorite?: boolean;
  onFavoriteChange?: (isFavorite: boolean) => void;
  showTags?: boolean;
  maxTags?: number;
}

/**
 * 音声クリップボタンコンポーネント
 *
 * 音声クリップを表示し、クリックで再生するボタンコンポーネント
 */
export default function AudioClipButton({
  clip,
  onPlay,
  isFavorite = false,
  onFavoriteChange,
  showTags = true,
  maxTags = 3,
}: AudioClipButtonProps) {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localFavorite, setLocalFavorite] = useState(isFavorite);

  // 再生ボタンクリック時の処理
  const handlePlay = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setIsPlaying(true);

    try {
      // 再生回数をインクリメント（Server Actionsを使用）
      await incrementPlayCount(clip.id);

      // 親コンポーネントに再生イベントを通知
      onPlay(clip);
    } catch (error) {
      console.error("再生処理に失敗しました:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // お気に入りボタンクリック時の処理
  const handleToggleFavorite = async () => {
    if (!user || isProcessing) return;

    setIsProcessing(true);

    try {
      const newFavoriteState = !localFavorite;

      // お気に入り状態を更新（Server Actionsを使用）
      const result = await toggleFavorite(clip.id);

      // ローカル状態を更新
      setLocalFavorite(result.isFavorite);

      // 親コンポーネントに状態変更を通知
      if (onFavoriteChange) {
        onFavoriteChange(result.isFavorite);
      }
    } catch (error) {
      console.error("お気に入り操作に失敗しました:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors">
      <div className="flex items-center p-3">
        {/* 再生ボタン */}
        <button
          type="button"
          onClick={handlePlay}
          disabled={isProcessing}
          className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
          aria-label={`${clip.title}を再生`}
        >
          {isPlaying ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <title>一時停止アイコン</title>
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <title>再生アイコン</title>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        {/* クリップ情報 */}
        <div className="ml-3 flex-grow overflow-hidden">
          <h3
            className="text-sm font-medium text-gray-900 truncate"
            title={clip.title}
          >
            {clip.title}
          </h3>
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <span className="truncate" title={clip.phrase}>
              {clip.phrase || "音声クリップ"}
            </span>
            <span className="mx-1">•</span>
            <span>{clip.formattedDuration}</span>
          </div>
        </div>

        {/* 作成者情報 */}
        <div className="flex-shrink-0 ml-2 text-xs text-gray-500">
          {clip.userPhotoURL ? (
            <img
              src={clip.userPhotoURL}
              alt={clip.userName}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <span className="text-xs">{clip.userName}</span>
          )}
        </div>

        {/* お気に入りボタン（ログイン時のみ表示） */}
        {user && (
          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={isProcessing}
            className={`ml-2 flex-shrink-0 p-1 rounded-full ${
              localFavorite
                ? "text-red-500 hover:text-red-600"
                : "text-gray-400 hover:text-gray-500"
            }`}
            aria-label={
              localFavorite ? "お気に入りから削除" : "お気に入りに追加"
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={localFavorite ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <title>お気に入りアイコン</title>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        )}

        {/* 再生回数 */}
        <div className="ml-2 flex-shrink-0 text-xs text-gray-500">
          <span title="再生回数">{clip.playCount}回</span>
        </div>
      </div>

      {/* タグ表示部分（showTagsがtrueで、かつタグが存在する場合に表示） */}
      {showTags && clip.tags && clip.tags.length > 0 && (
        <div className="px-3 pb-3 pt-0">
          <TagDisplay
            tags={clip.tags}
            maxDisplay={maxTags}
            size="sm"
            className="mt-1"
          />
        </div>
      )}
    </div>
  );
}
