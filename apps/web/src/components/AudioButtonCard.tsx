"use client";

import { incrementLikeCount, incrementPlayCount } from "@/app/buttons/actions";
import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { AudioPlayer } from "@suzumina.click/ui/components/audio-player";
import { Badge } from "@suzumina.click/ui/components/badge";
import { Button } from "@suzumina.click/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@suzumina.click/ui/components/card";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Calendar,
  Clock,
  ExternalLink,
  Eye,
  Heart,
  Play,
  Tag,
  User,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface AudioButtonCardProps {
  audioButton: FrontendAudioButtonData;
  showSourceVideo?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "compact";
  onPlayCountUpdate?: (id: string, newCount: number) => void;
  onLikeCountUpdate?: (id: string, newCount: number) => void;
}

export function AudioButtonCard({
  audioButton,
  showSourceVideo = true,
  size = "md",
  variant = "default",
  onPlayCountUpdate,
  onLikeCountUpdate,
}: AudioButtonCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [localPlayCount, setLocalPlayCount] = useState(audioButton.playCount);
  const [localLikeCount, setLocalLikeCount] = useState(audioButton.likeCount);

  // 再生時の処理
  const handlePlay = async () => {
    try {
      const result = await incrementPlayCount(audioButton.id);
      if (result.success) {
        const newCount = localPlayCount + 1;
        setLocalPlayCount(newCount);
        onPlayCountUpdate?.(audioButton.id, newCount);
      }
    } catch (error) {
      console.error("再生回数更新エラー:", error);
    }
  };

  // いいね時の処理
  const handleLike = async () => {
    if (isLiked) return;

    try {
      const result = await incrementLikeCount(audioButton.id);
      if (result.success) {
        setIsLiked(true);
        const newCount = localLikeCount + 1;
        setLocalLikeCount(newCount);
        onLikeCountUpdate?.(audioButton.id, newCount);
      }
    } catch (error) {
      console.error("いいね数更新エラー:", error);
    }
  };

  // 相対時間を計算
  const getRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ja,
      });
    } catch {
      return "不明";
    }
  };

  // カテゴリ表示名
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      voice: "ボイス",
      bgm: "BGM・音楽",
      se: "効果音",
      talk: "トーク・会話",
      singing: "歌唱",
      other: "その他",
    };
    return labels[category] || category;
  };

  // サイズクラス（モバイル対応）
  const sizeClasses = {
    sm: {
      card: "p-3 sm:p-3",
      title: "text-sm sm:text-sm",
      description: "text-xs sm:text-xs",
      meta: "text-xs sm:text-xs",
      spacing: "gap-2 sm:gap-2",
    },
    md: {
      card: "p-3 sm:p-4",
      title: "text-sm sm:text-base",
      description: "text-xs sm:text-sm",
      meta: "text-xs sm:text-sm",
      spacing: "gap-2 sm:gap-3",
    },
    lg: {
      card: "p-4 sm:p-6",
      title: "text-base sm:text-lg",
      description: "text-sm sm:text-base",
      meta: "text-sm sm:text-base",
      spacing: "gap-3 sm:gap-4",
    },
  };

  const sizeClass = sizeClasses[size];

  if (variant === "compact") {
    return (
      <Card className="hover:shadow-md transition-shadow duration-200 border">
        <CardContent
          className={`${sizeClass.card} ${sizeClass.spacing} flex items-center space-y-0`}
        >
          {/* 音声プレイヤー */}
          <div className="flex-shrink-0">
            <AudioPlayer
              src={audioButton.audioUrl}
              title={audioButton.title}
              showTitle={false}
              showProgress={false}
              showVolume={false}
              showReplayButton={false}
              size="sm"
              variant="minimal"
              onPlay={handlePlay}
            />
          </div>

          {/* 情報 */}
          <div className="flex-1 min-w-0 ml-2 sm:ml-3">
            <h3
              className={`font-medium truncate ${sizeClass.title} leading-tight`}
            >
              <Link
                href={`/buttons/${audioButton.id}`}
                className="hover:text-foreground/80 transition-colors text-foreground min-h-[44px] flex items-center"
              >
                {audioButton.title}
              </Link>
            </h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Play className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs sm:text-xs whitespace-nowrap">
                  {localPlayCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs sm:text-xs whitespace-nowrap">
                  {audioButton.durationText}
                </span>
              </div>
              <Badge
                variant="secondary"
                className="text-xs bg-muted text-muted-foreground flex-shrink-0"
              >
                {getCategoryLabel(audioButton.category)}
              </Badge>
            </div>
          </div>

          {/* いいねボタン */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLiked}
            className={`flex-shrink-0 min-h-[44px] min-w-[44px] ${isLiked ? "text-foreground" : "text-muted-foreground"} hover:text-foreground/80`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            <span className="ml-1 text-xs hidden sm:inline">
              {localLikeCount}
            </span>
            <span className="ml-1 text-xs sm:hidden">
              {localLikeCount > 999
                ? `${Math.floor(localLikeCount / 1000)}k`
                : localLikeCount}
            </span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border">
      <CardHeader className={sizeClass.card}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className={`${sizeClass.title} leading-tight`}>
              <Link
                href={`/buttons/${audioButton.id}`}
                className="hover:text-foreground/80 transition-colors text-foreground min-h-[44px] flex items-center"
              >
                {audioButton.title}
              </Link>
            </CardTitle>
            {audioButton.description && (
              <CardDescription
                className={`mt-1 ${sizeClass.description} line-clamp-2 sm:line-clamp-none`}
              >
                {audioButton.description}
              </CardDescription>
            )}
          </div>

          {/* カテゴリバッジ */}
          <Badge
            variant="secondary"
            className="sm:ml-2 flex-shrink-0 bg-muted text-muted-foreground self-start"
          >
            {getCategoryLabel(audioButton.category)}
          </Badge>
        </div>

        {/* タグ */}
        {audioButton.tags && audioButton.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {audioButton.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs border text-muted-foreground"
              >
                <Tag className="h-2 w-2 mr-1" />
                {tag}
              </Badge>
            ))}
            {audioButton.tags.length > 3 && (
              <Badge
                variant="outline"
                className="text-xs border text-muted-foreground"
              >
                +{audioButton.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className={`${sizeClass.card} pt-0 space-y-3 sm:space-y-4`}>
        {/* 音声プレイヤー */}
        <div className="w-full">
          <AudioPlayer
            src={audioButton.audioUrl}
            title={audioButton.title}
            showTitle={false}
            showProgress={true}
            showVolume={true}
            showReplayButton={true}
            size={size === "lg" ? "md" : "sm"}
            variant="compact"
            onPlay={handlePlay}
          />
        </div>

        {/* メタデータ */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 ${sizeClass.meta} text-muted-foreground`}
        >
          {/* 統計情報 */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                再生回数: {localPlayCount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                いいね: {localLikeCount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 時間情報 */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Volume2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">長さ: {audioButton.durationText}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {getRelativeTime(audioButton.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* 作成者情報 */}
        {audioButton.uploadedBy && (
          <div
            className={`flex items-center gap-1 ${sizeClass.meta} text-muted-foreground`}
          >
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">作成者: {audioButton.uploadedBy}</span>
          </div>
        )}

        {/* 元動画情報 */}
        {showSourceVideo && audioButton.sourceVideoId && (
          <div className="p-2 sm:p-3 bg-muted rounded-lg">
            <div
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${sizeClass.meta}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {audioButton.sourceVideoTitle || "元動画"}
                </p>
                {audioButton.startTime !== undefined &&
                  audioButton.endTime !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {audioButton.startTime}秒 - {audioButton.endTime}秒
                    </p>
                  )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="flex-shrink-0 min-h-[44px] self-start sm:self-center"
              >
                <Link href={`/videos/${audioButton.sourceVideoId}`}>
                  <ExternalLink className="h-3 w-3" />
                  <span className="ml-1 sm:hidden">動画を見る</span>
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLike}
            disabled={isLiked}
            className={`flex-1 border min-h-[44px] ${isLiked ? "text-foreground border bg-accent" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Heart
              className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`}
            />
            <span className="sm:hidden">{isLiked ? "済み" : "いいね"}</span>
            <span className="hidden sm:inline">
              {isLiked ? "いいね済み" : "いいね"}
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border text-muted-foreground hover:bg-muted min-h-[44px]"
            asChild
          >
            <Link href={`/buttons/${audioButton.id}`}>
              <span className="sm:hidden">詳細</span>
              <span className="hidden sm:inline">詳細を見る</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
