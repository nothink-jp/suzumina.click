"use client";

import { useEffect, useRef, useState } from "react";
import type { YouTubePlayer } from "../../components/videos/YouTubeEmbed";
import type { AudioClip } from "../../lib/audioclips/types";

interface AudioClipPlayerProps {
  clip: AudioClip | null;
  isPlaying?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  onClose: () => void;
  youtubePlayerRef?: React.RefObject<YouTubePlayer>;
}

/**
 * 音声クリップ再生コンポーネント
 *
 * 音声クリップを再生するためのプレーヤーUI
 * YouTubeプレーヤーを使用して、指定された開始時間から終了時間までの音声を再生
 */
export default function AudioClipPlayer({
  clip,
  isPlaying: externalIsPlaying,
  onPlayingChange,
  onClose,
  youtubePlayerRef,
}: AudioClipPlayerProps) {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  // isPlaying が props として渡されている場合はそちらを優先
  const isPlaying =
    externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // クリップが変更されたら再生を開始
  useEffect(() => {
    if (clip) {
      playClip();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [clip]);

  // YouTubeプレーヤーを使用してクリップを再生
  const playClip = () => {
    if (!clip || !youtubePlayerRef?.current) return;

    // 現在の再生位置をリセット
    setCurrentTime(0);

    // YouTubeプレーヤーの再生位置を設定
    youtubePlayerRef.current.seekTo(clip.startTime, true);
    youtubePlayerRef.current.playVideo();

    // 再生状態を更新
    setInternalIsPlaying(true);
    // 外部のステート更新コールバック
    if (onPlayingChange) {
      onPlayingChange(true);
    }

    // 再生位置を追跡するタイマーを設定
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      if (youtubePlayerRef.current) {
        const playerTime = youtubePlayerRef.current.getCurrentTime();
        const clipTime = playerTime - clip.startTime;

        // 再生位置を更新
        setCurrentTime(clipTime);

        // 終了時間に達したら停止
        if (playerTime >= clip.endTime) {
          pauseClip();
        }
      }
    }, 100);
  };

  // 再生を一時停止
  const pauseClip = () => {
    if (!youtubePlayerRef?.current) return;

    youtubePlayerRef.current.pauseVideo();
    setInternalIsPlaying(false);
    // 外部のステート更新コールバック
    if (onPlayingChange) {
      onPlayingChange(false);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // 再生/一時停止を切り替え
  const togglePlay = () => {
    if (isPlaying) {
      pauseClip();
    } else {
      playClip();
    }
  };

  // 音量を変更
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number.parseInt(e.target.value, 10);
    setVolume(newVolume);

    if (youtubePlayerRef?.current) {
      youtubePlayerRef.current.setVolume(newVolume);
    }
  };

  // 再生位置を変更
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!clip || !youtubePlayerRef?.current) return;

    const seekTime = Number.parseFloat(e.target.value);
    setCurrentTime(seekTime);

    const absoluteTime = clip.startTime + seekTime;
    youtubePlayerRef.current.seekTo(absoluteTime, true);
  };

  // 再生時間をフォーマット（秒 → MM:SS）
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // クリップが選択されていない場合は何も表示しない
  if (!clip) return null;

  // クリップの再生時間
  const duration = clip.endTime - clip.startTime;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-3 z-50">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-center">
          {/* 再生/一時停止ボタン */}
          <button
            type="button"
            onClick={togglePlay}
            className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
            aria-label={isPlaying ? "一時停止" : "再生"}
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
          <div className="ml-3 flex-shrink-0 w-48 overflow-hidden">
            <h3
              className="text-sm font-medium text-gray-900 truncate"
              title={clip.title}
            >
              {clip.title}
            </h3>
            <p className="text-xs text-gray-500 truncate" title={clip.phrase}>
              {clip.phrase || "音声クリップ"}
            </p>
          </div>

          {/* 再生時間 */}
          <div className="ml-3 text-xs text-gray-500 w-16 flex-shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* シークバー */}
          <div className="mx-3 flex-grow">
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* 音量コントロール */}
          <div className="flex items-center ml-3 w-32 flex-shrink-0">
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
              className="text-gray-500"
              aria-hidden="true"
            >
              <title>音量アイコン</title>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {volume > 0 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
              {volume > 50 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
            </svg>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="ml-2 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* 閉じるボタン */}
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-500"
            aria-label="プレーヤーを閉じる"
          >
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
              <title>閉じるアイコン</title>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
