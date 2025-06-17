"use client";

import { incrementLikeCount, incrementPlayCount } from "@/app/buttons/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { AudioPlayer } from "@suzumina.click/ui/components/audio-player";
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

  // サイズクラス
  const sizeClasses = {
    sm: {
      card: "p-3",
      title: "text-sm",
      description: "text-xs",
      meta: "text-xs",
      spacing: "gap-2",
    },
    md: {
      card: "p-4",
      title: "text-base",
      description: "text-sm",
      meta: "text-sm",
      spacing: "gap-3",
    },
    lg: {
      card: "p-6",
      title: "text-lg",
      description: "text-base",
      meta: "text-base",
      spacing: "gap-4",
    },
  };

  const sizeClass = sizeClasses[size];

  if (variant === "compact") {
    return (
      <Card className="hover:shadow-md transition-shadow duration-200">
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
          <div className="flex-1 min-w-0 ml-3">
            <h3 className={`font-medium truncate ${sizeClass.title}`}>
              <Link
                href={`/buttons/${audioButton.id}`}
                className="hover:text-blue-600 transition-colors"
              >
                {audioButton.title}
              </Link>
            </h3>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1 text-gray-500">
                <Play className="h-3 w-3" />
                <span className="text-xs">
                  {localPlayCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <Clock className="h-3 w-3" />
                <span className="text-xs">{audioButton.durationText}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
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
            className={`flex-shrink-0 ${isLiked ? "text-red-500" : "text-gray-500"}`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            <span className="ml-1 text-xs">{localLikeCount}</span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className={sizeClass.card}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className={`truncate ${sizeClass.title}`}>
              <Link
                href={`/buttons/${audioButton.id}`}
                className="hover:text-blue-600 transition-colors"
              >
                {audioButton.title}
              </Link>
            </CardTitle>
            {audioButton.description && (
              <CardDescription className={`mt-1 ${sizeClass.description}`}>
                {audioButton.description}
              </CardDescription>
            )}
          </div>

          {/* カテゴリバッジ */}
          <Badge variant="secondary" className="ml-2 flex-shrink-0">
            {getCategoryLabel(audioButton.category)}
          </Badge>
        </div>

        {/* タグ */}
        {audioButton.tags && audioButton.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {audioButton.tags.slice(0, 5).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                <Tag className="h-2 w-2 mr-1" />
                {tag}
              </Badge>
            ))}
            {audioButton.tags.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{audioButton.tags.length - 5}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className={`${sizeClass.card} pt-0 space-y-4`}>
        {/* 音声プレイヤー */}
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

        {/* メタデータ */}
        <div
          className={`grid grid-cols-2 gap-4 ${sizeClass.meta} text-gray-600`}
        >
          {/* 統計情報 */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>再生回数: {localPlayCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span>いいね: {localLikeCount.toLocaleString()}</span>
            </div>
          </div>

          {/* 時間情報 */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              <span>長さ: {audioButton.durationText}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{getRelativeTime(audioButton.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* 作成者情報 */}
        {audioButton.uploadedBy && (
          <div
            className={`flex items-center gap-1 ${sizeClass.meta} text-gray-600`}
          >
            <User className="h-3 w-3" />
            <span>作成者: {audioButton.uploadedBy}</span>
          </div>
        )}

        {/* 元動画情報 */}
        {showSourceVideo && audioButton.sourceVideoId && (
          <div className="p-2 bg-gray-50 rounded-lg">
            <div
              className={`flex items-center justify-between ${sizeClass.meta}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-700 truncate">
                  {audioButton.sourceVideoTitle || "元動画"}
                </p>
                {audioButton.startTime !== undefined &&
                  audioButton.endTime !== undefined && (
                    <p className="text-xs text-gray-500">
                      {audioButton.startTime}秒 - {audioButton.endTime}秒
                    </p>
                  )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="flex-shrink-0"
              >
                <Link href={`/videos/${audioButton.sourceVideoId}`}>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLike}
            disabled={isLiked}
            className={`flex-1 ${isLiked ? "text-red-500 border-red-200" : ""}`}
          >
            <Heart
              className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`}
            />
            {isLiked ? "いいね済み" : "いいね"}
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/buttons/${audioButton.id}`}>詳細を見る</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
