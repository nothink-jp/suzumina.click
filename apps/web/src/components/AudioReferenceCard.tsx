"use client";

import {
  type FrontendAudioReferenceData,
  formatTimestamp,
  getAudioReferenceCategoryLabel,
} from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/badge";
import { Button } from "@suzumina.click/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@suzumina.click/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@suzumina.click/ui/components/dialog";
import {
  Clock,
  ExternalLink,
  Eye,
  Heart,
  Pause,
  Play,
  Share2,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import {
  decrementLikeCount,
  incrementLikeCount,
  incrementPlayCount,
  incrementViewCount,
} from "@/app/buttons/actions";
import {
  useYouTubePlayer,
  YouTubePlayer,
  type YTPlayer,
} from "./YouTubePlayer";

/**
 * AudioReferenceCard component props
 */
export interface AudioReferenceCardProps {
  /** 音声リファレンスデータ */
  audioReference: FrontendAudioReferenceData;
  /** サイズバリアント */
  size?: "sm" | "md" | "lg";
  /** 表示バリアント */
  variant?: "default" | "compact" | "detailed";
  /** 元動画の表示 */
  showSourceVideo?: boolean;
  /** 詳細表示 */
  showDescription?: boolean;
  /** 統計表示 */
  showStats?: boolean;
  /** インタラクション可能 */
  interactive?: boolean;
  /** プレビューモード（作成時のプレビュー） */
  isPreview?: boolean;
  /** クリック時のコールバック */
  onClick?: (audioReference: FrontendAudioReferenceData) => void;
  /** クラス名 */
  className?: string;
}

/**
 * AudioReferenceCard Component
 *
 * タイムスタンプ参照システムによる音声ボタンカード
 */
export function AudioReferenceCard({
  audioReference,
  size = "md",
  variant = "default",
  showSourceVideo = true,
  showDescription = true,
  showStats = true,
  interactive = true,
  isPreview = false,
  onClick,
  className = "",
}: AudioReferenceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [localStats, setLocalStats] = useState({
    playCount: audioReference.playCount,
    likeCount: audioReference.likeCount,
    viewCount: audioReference.viewCount,
  });

  const { player, handlers } = useYouTubePlayer();

  // YouTube URLを生成
  const youtubeUrl = `https://www.youtube.com/watch?v=${audioReference.videoId}&t=${audioReference.startTime}s`;

  // カード表示時の処理
  const handleCardView = useCallback(async () => {
    if (!hasViewed && !isPreview) {
      setHasViewed(true);
      try {
        await incrementViewCount(audioReference.id);
        setLocalStats((prev) => ({ ...prev, viewCount: prev.viewCount + 1 }));
      } catch (error) {
        console.error("表示回数更新エラー:", error);
      }
    }
  }, [audioReference.id, hasViewed, isPreview]);

  // 再生ボタンクリック処理
  const handlePlayClick = useCallback(async () => {
    if (!interactive) return;

    try {
      if (!isDialogOpen) {
        setIsDialogOpen(true);
      }

      // 再生統計を更新（プレビューモードでは無効）
      if (!isPlaying && !isPreview) {
        await incrementPlayCount(audioReference.id);
        setLocalStats((prev) => ({ ...prev, playCount: prev.playCount + 1 }));
      }

      setIsPlaying(!isPlaying);
      onClick?.(audioReference);
      handleCardView();
    } catch (error) {
      console.error("再生処理エラー:", error);
    }
  }, [
    interactive,
    isDialogOpen,
    isPlaying,
    isPreview,
    audioReference,
    onClick,
    handleCardView,
  ]);

  // いいね処理
  const handleLikeClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!interactive || isPreview) return;

      try {
        if (liked) {
          await decrementLikeCount(audioReference.id);
          setLocalStats((prev) => ({ ...prev, likeCount: prev.likeCount - 1 }));
          setLiked(false);
        } else {
          await incrementLikeCount(audioReference.id);
          setLocalStats((prev) => ({ ...prev, likeCount: prev.likeCount + 1 }));
          setLiked(true);
        }
      } catch (error) {
        console.error("いいね処理エラー:", error);
      }
    },
    [interactive, isPreview, liked, audioReference.id],
  );

  // 共有処理
  const handleShareClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (navigator.share) {
        try {
          await navigator.share({
            title: audioReference.title,
            text:
              audioReference.description ||
              `「${audioReference.title}」の音声ボタン`,
            url: youtubeUrl,
          });
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            console.error("共有エラー:", error);
          }
        }
      } else {
        // フォールバック: クリップボードにコピー
        try {
          await navigator.clipboard.writeText(youtubeUrl);
          // TODO: トースト通知
          console.log("URLをクリップボードにコピーしました");
        } catch (error) {
          console.error("クリップボードコピーエラー:", error);
        }
      }
    },
    [audioReference, youtubeUrl],
  );

  // プレイヤーの制御
  const handlePlayerReady = useCallback(
    (playerInstance: YTPlayer) => {
      handlers.onReady(playerInstance);

      // 指定範囲に自動シーク
      if (audioReference.startTime > 0) {
        playerInstance.seekTo(audioReference.startTime);
      }
    },
    [audioReference.startTime, handlers.onReady],
  );

  const handlePlayerStateChange = useCallback(
    (state: number) => {
      handlers.onStateChange(state);

      // 終了時間に達したら停止
      if (state === 1 && audioReference.endTime) {
        // PLAYING
        const checkEndTime = setInterval(() => {
          if (
            player &&
            audioReference.endTime &&
            player.getCurrentTime() >= audioReference.endTime
          ) {
            player.pauseVideo();
            clearInterval(checkEndTime);
          }
        }, 100);
      }
    },
    [audioReference.endTime, player, handlers.onStateChange],
  );

  // サイズとバリアントに基づくスタイル
  const getCardStyles = () => {
    const baseStyles = "transition-all duration-200 hover:shadow-md";

    const sizeStyles = {
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    };

    const variantStyles = {
      default: "border border-border",
      compact: "border border-border",
      detailed: "border border-border shadow-sm",
    };

    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;
  };

  const getTitleSize = () => {
    const sizeMap = {
      sm: "text-sm font-medium",
      md: "text-base font-medium",
      lg: "text-lg font-semibold",
    };
    return sizeMap[size];
  };

  return (
    <Card className={getCardStyles()} onClick={handleCardView}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className={`${getTitleSize()} truncate`}>
              {audioReference.title}
            </CardTitle>
            {showDescription &&
              audioReference.description &&
              variant !== "compact" && (
                <CardDescription className="mt-1 text-sm line-clamp-2">
                  {audioReference.description}
                </CardDescription>
              )}
          </div>
          <Badge variant="secondary" className="ml-2 shrink-0">
            {getAudioReferenceCategoryLabel(audioReference.category)}
          </Badge>
        </div>

        {/* タグ表示 */}
        {audioReference.tags &&
          audioReference.tags.length > 0 &&
          variant !== "compact" && (
            <div className="flex flex-wrap gap-1 mt-2">
              {audioReference.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="h-2 w-2 mr-1" />
                  {tag}
                </Badge>
              ))}
              {audioReference.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{audioReference.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 再生ボタンエリア */}
        <div className="flex items-center gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size={size === "sm" ? "sm" : "default"}
                className="flex-1"
                onClick={handlePlayClick}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isPlaying ? "停止" : "再生"}
                <span className="ml-2 text-xs">
                  {audioReference.timestampText}
                </span>
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{audioReference.title}</DialogTitle>
                <DialogDescription>
                  {audioReference.videoTitle} - {audioReference.timestampText}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <YouTubePlayer
                  videoId={audioReference.videoId}
                  width="100%"
                  height="400"
                  startTime={audioReference.startTime}
                  endTime={audioReference.endTime}
                  onReady={handlePlayerReady}
                  onStateChange={handlePlayerStateChange}
                  onTimeUpdate={handlers.onTimeUpdate}
                />

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    再生範囲: {formatTimestamp(audioReference.startTime)} -{" "}
                    {formatTimestamp(audioReference.endTime)}（
                    {audioReference.durationText}）
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={audioReference.youtubeUrl} target="_blank">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      YouTubeで開く
                    </Link>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* アクションボタン群 */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLikeClick}
              className={liked ? "bg-red-50 border-red-200" : ""}
            >
              <Heart
                className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`}
              />
            </Button>

            <Button variant="outline" size="sm" onClick={handleShareClick}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 統計情報 */}
        {showStats && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Play className="h-3 w-3" />
                {localStats.playCount.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {localStats.likeCount.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {localStats.viewCount.toLocaleString()}
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {audioReference.durationText}
            </span>
          </div>
        )}

        {/* 元動画情報 */}
        {showSourceVideo && variant !== "compact" && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {audioReference.videoTitle}
                </p>
                {audioReference.channelTitle && (
                  <p className="text-xs text-muted-foreground truncate">
                    {audioReference.channelTitle}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/videos/${audioReference.videoId}`}>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* 作成日時 */}
        <div className="text-xs text-muted-foreground text-right">
          {new Date(audioReference.createdAt).toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * AudioReferenceCardSkeleton Component
 *
 * ローディング中に表示するスケルトン
 */
export function AudioReferenceCardSkeleton({
  size = "md",
  variant = "default",
}: Pick<AudioReferenceCardProps, "size" | "variant">) {
  const getCardStyles = () => {
    const sizeStyles = {
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    };
    return `animate-pulse ${sizeStyles[size]}`;
  };

  return (
    <Card className={getCardStyles()}>
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          {variant !== "compact" && (
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          )}
        </div>
        {variant !== "compact" && (
          <div className="flex gap-1 mt-2">
            <div className="h-5 bg-gray-200 rounded w-12" />
            <div className="h-5 bg-gray-200 rounded w-16" />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="h-10 bg-gray-200 rounded" />
        <div className="flex justify-between">
          <div className="flex gap-4">
            <div className="h-4 bg-gray-200 rounded w-8" />
            <div className="h-4 bg-gray-200 rounded w-8" />
            <div className="h-4 bg-gray-200 rounded w-8" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

export default AudioReferenceCard;
