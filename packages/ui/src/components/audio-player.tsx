"use client";

import { cn } from "@suzumina.click/ui/lib/utils";
import {
  Loader2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./button.js";
import { Slider } from "./slider.js";

interface AudioPlayerProps {
  src: string;
  title?: string;
  autoPlay?: boolean;
  loop?: boolean;
  showTitle?: boolean;
  showProgress?: boolean;
  showVolume?: boolean;
  showSkipButtons?: boolean;
  showReplayButton?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "compact" | "minimal";
}

export function AudioPlayer({
  src,
  title,
  autoPlay = false,
  loop = false,
  showTitle = true,
  showProgress = true,
  showVolume = true,
  showSkipButtons = false,
  showReplayButton = true,
  className,
  onPlay,
  onPause,
  onEnded,
  onError,
  onTimeUpdate,
  size = "md",
  variant = "default",
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const previousVolumeRef = useRef(1);

  // 時間フォーマット関数
  const formatTime = useCallback((time: number): string => {
    if (!Number.isFinite(time) || Number.isNaN(time)) return "0:00";

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  // 音声の読み込み
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    setIsLoading(true);
    setHasError(false);

    audio.src = src;
    audio.load();

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);

      if (autoPlay) {
        audio.play().catch((error) => {
          console.warn("自動再生に失敗:", error);
          setIsPlaying(false);
        });
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
      const errorMessage = "音声ファイルの読み込みに失敗しました";
      onError?.(errorMessage);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, [src, autoPlay, onError]);

  // 音声イベントリスナー
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const current = audio.currentTime;
      setCurrentTime(current);
      onTimeUpdate?.(current, audio.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };

    const handleVolumeChange = () => {
      setVolume(audio.volume);
      setIsMuted(audio.muted);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("volumechange", handleVolumeChange);

    // 初期ボリューム設定
    audio.volume = volume;
    audio.muted = isMuted;
    audio.loop = loop;

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [volume, isMuted, loop, onPlay, onPause, onEnded, onTimeUpdate]);

  // 再生/一時停止切り替え
  const togglePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || hasError) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (error) {
      console.error("再生エラー:", error);
      setIsPlaying(false);
      onError?.("音声の再生に失敗しました");
    }
  }, [isPlaying, hasError, onError]);

  // シーク
  const handleSeek = useCallback(
    (values: number[]) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;

      const newTime = values[0];
      if (newTime !== undefined) {
        audio.currentTime = newTime;
        setCurrentTime(newTime);
      }
    },
    [duration],
  );

  // ボリューム変更
  const handleVolumeChange = useCallback(
    (values: number[]) => {
      const audio = audioRef.current;
      if (!audio) return;

      const newVolume = values[0];
      if (newVolume !== undefined) {
        audio.volume = newVolume;
        setVolume(newVolume);

        if (newVolume > 0 && isMuted) {
          audio.muted = false;
          setIsMuted(false);
        }
      }
    },
    [isMuted],
  );

  // ミュート切り替え
  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.muted = false;
      audio.volume = previousVolumeRef.current;
      setVolume(previousVolumeRef.current);
    } else {
      previousVolumeRef.current = volume;
      audio.muted = true;
      setVolume(0);
    }
    setIsMuted(!isMuted);
  }, [isMuted, volume]);

  // リプレイ
  const handleReplay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);

    if (!isPlaying) {
      audio.play().catch((error) => {
        console.error("リプレイエラー:", error);
        onError?.("音声の再生に失敗しました");
      });
    }
  }, [isPlaying, onError]);

  // スキップ機能
  const handleSkipBackward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, audio.currentTime - 10);
  }, []);

  const handleSkipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.min(duration, audio.currentTime + 10);
  }, [duration]);

  // サイズクラス
  const sizeClasses = {
    sm: {
      container: "p-3",
      button: "h-8 w-8",
      icon: "h-4 w-4",
      text: "text-sm",
      spacing: "gap-2",
    },
    md: {
      container: "p-4",
      button: "h-10 w-10",
      icon: "h-5 w-5",
      text: "text-base",
      spacing: "gap-3",
    },
    lg: {
      container: "p-6",
      button: "h-12 w-12",
      icon: "h-6 w-6",
      text: "text-lg",
      spacing: "gap-4",
    },
  };

  const sizeClass = sizeClasses[size];

  // バリアント別スタイル
  const getVariantStyle = () => {
    switch (variant) {
      case "compact":
        return "bg-gray-50 border rounded-lg";
      case "minimal":
        return "";
      default:
        return "bg-white border rounded-lg shadow-sm";
    }
  };

  return (
    <div
      className={cn(
        "audio-player",
        sizeClass.container,
        getVariantStyle(),
        className,
      )}
    >
      <audio
        ref={audioRef}
        preload="metadata"
        className="hidden"
        aria-label={title || "音声プレイヤー"}
      >
        <track kind="captions" />
      </audio>

      {/* タイトル */}
      {showTitle && title && variant !== "minimal" && (
        <div className={cn("mb-2 font-medium truncate", sizeClass.text)}>
          {title}
        </div>
      )}

      {/* メインコントロール */}
      <div className={cn("flex items-center", sizeClass.spacing)}>
        {/* スキップ戻るボタン */}
        {showSkipButtons && (
          <Button
            variant="ghost"
            size="sm"
            className={sizeClass.button}
            onClick={handleSkipBackward}
            disabled={isLoading || hasError}
            aria-label="10秒戻る"
          >
            <SkipBack className={sizeClass.icon} />
          </Button>
        )}

        {/* リプレイボタン */}
        {showReplayButton && (
          <Button
            variant="ghost"
            size="sm"
            className={sizeClass.button}
            onClick={handleReplay}
            disabled={isLoading || hasError}
            aria-label="最初から再生"
          >
            <RotateCcw className={sizeClass.icon} />
          </Button>
        )}

        {/* 再生/一時停止ボタン */}
        <Button
          variant="default"
          size="sm"
          className={cn(sizeClass.button, "bg-blue-600 hover:bg-blue-700")}
          onClick={togglePlayPause}
          disabled={isLoading || hasError}
          aria-label={isPlaying ? "一時停止" : "再生"}
        >
          {isLoading ? (
            <Loader2 className={cn(sizeClass.icon, "animate-spin")} />
          ) : isPlaying ? (
            <Pause className={sizeClass.icon} />
          ) : (
            <Play className={sizeClass.icon} />
          )}
        </Button>

        {/* スキップ進むボタン */}
        {showSkipButtons && (
          <Button
            variant="ghost"
            size="sm"
            className={sizeClass.button}
            onClick={handleSkipForward}
            disabled={isLoading || hasError}
            aria-label="10秒進む"
          >
            <SkipForward className={sizeClass.icon} />
          </Button>
        )}

        {/* 進行状況とボリューム */}
        <div className="flex-1 space-y-2">
          {/* 進行状況バー */}
          {showProgress && (
            <div className="space-y-1">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                disabled={isLoading || hasError || !duration}
                className="w-full"
                aria-label="再生位置"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          {/* ボリュームコントロール */}
          {showVolume && variant !== "minimal" && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={toggleMute}
                aria-label={isMuted ? "ミュート解除" : "ミュート"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-20"
                aria-label="音量"
              />
            </div>
          )}
        </div>
      </div>

      {/* エラー表示 */}
      {hasError && (
        <div className="mt-2 text-sm text-red-600">
          音声の読み込みに失敗しました
        </div>
      )}
    </div>
  );
}
