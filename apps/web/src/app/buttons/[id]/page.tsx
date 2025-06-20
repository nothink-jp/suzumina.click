import {
  getAudioReferenceById,
  getAudioReferences,
} from "@/app/buttons/actions";
import { AudioReferenceCard } from "@/components/AudioReferenceCard";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import type { AudioReferenceQuery } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/badge";
import { Button } from "@suzumina.click/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@suzumina.click/ui/components/card";
import { Separator } from "@suzumina.click/ui/components/separator";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  Heart,
  Play,
  Share2,
  Tag,
  Youtube,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface AudioButtonDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// 時間フォーマット関数
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// 相対時間表示
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}分前`;
    }
    return `${diffHours}時間前`;
  }
  if (diffDays < 7) {
    return `${diffDays}日前`;
  }
  return date.toLocaleDateString("ja-JP");
}

// カテゴリ表示名の変換
function getCategoryDisplayName(category: string): string {
  const categoryNames: Record<string, string> = {
    voice: "ボイス",
    bgm: "BGM",
    se: "効果音",
    talk: "トーク",
    singing: "歌唱",
    other: "その他",
  };
  return categoryNames[category] || category;
}

// 関連音声ボタンコンポーネント
async function RelatedAudioButtons({
  currentId,
  videoId,
  tags,
}: {
  currentId: string;
  videoId: string;
  tags: string[];
}) {
  try {
    // 同じ動画の音声ボタンを取得
    const sameVideoQuery: AudioReferenceQuery = {
      videoId,
      limit: 6,
      sortBy: "newest",
      onlyPublic: true,
    };

    const sameVideoResult = await getAudioReferences(sameVideoQuery);

    if (sameVideoResult.success) {
      const relatedButtons = sameVideoResult.data.audioReferences.filter(
        (button) => button.id !== currentId,
      );

      if (relatedButtons.length > 0) {
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Youtube className="h-5 w-5" />
                同じ動画の音声ボタン
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relatedButtons.slice(0, 4).map((audioReference) => (
                  <AudioReferenceCard
                    key={audioReference.id}
                    audioReference={audioReference}
                    showSourceVideo={false}
                    size="sm"
                    variant="compact"
                  />
                ))}
              </div>
              {relatedButtons.length > 4 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/buttons?videoId=${videoId}`}>
                      この動画の音声ボタンをもっと見る
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      }
    }
  } catch (error) {
    console.error("関連音声ボタン取得エラー:", error);
  }

  return null;
}

export default async function AudioButtonDetailPage({
  params,
}: AudioButtonDetailPageProps) {
  const resolvedParams = await params;

  const result = await getAudioReferenceById(resolvedParams.id);

  if (!result.success) {
    notFound();
  }

  const audioReference = result.data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* パンくずナビゲーション */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/buttons" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            音声ボタン一覧に戻る
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* メインコンテンツ */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {audioReference.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatRelativeTime(audioReference.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {audioReference.duration}秒
                  </span>
                  <span className="flex items-center gap-1">
                    <Play className="h-4 w-4" />
                    {audioReference.playCount}回再生
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {audioReference.likeCount}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                共有
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* カテゴリとタグ */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">
                {getCategoryDisplayName(audioReference.category)}
              </Badge>
              {audioReference.tags && audioReference.tags.length > 0 && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  {audioReference.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </>
              )}
            </div>

            {/* 説明 */}
            {audioReference.description && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">
                  説明
                </h3>
                <p className="text-sm text-foreground">
                  {audioReference.description}
                </p>
              </div>
            )}

            {/* YouTube動画情報 */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium text-sm text-muted-foreground mb-2">
                元動画
              </h3>
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  {audioReference.videoTitle}
                </p>
                <p className="text-sm text-muted-foreground">
                  時間: {formatTime(audioReference.startTime)} -{" "}
                  {formatTime(audioReference.endTime)}({audioReference.duration}
                  秒)
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/videos/${audioReference.videoId}`}>
                    <Youtube className="h-4 w-4 mr-2" />
                    動画詳細を見る
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* YouTube Player */}
        <Card>
          <CardHeader>
            <CardTitle>YouTube動画プレイヤー</CardTitle>
          </CardHeader>
          <CardContent>
            <YouTubePlayer
              videoId={audioReference.videoId}
              width="100%"
              height="400"
              startTime={audioReference.startTime}
              endTime={audioReference.endTime}
              controls
              autoplay={false}
            />
          </CardContent>
        </Card>

        {/* 音声ボタンアクション */}
        <Card>
          <CardHeader>
            <CardTitle>この音声ボタン</CardTitle>
          </CardHeader>
          <CardContent>
            <AudioReferenceCard
              audioReference={audioReference}
              showSourceVideo={true}
              size="lg"
              variant="detailed"
            />
          </CardContent>
        </Card>

        {/* 関連音声ボタン */}
        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>関連音声ボタン</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <Eye className="h-8 w-8 animate-pulse text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          }
        >
          <RelatedAudioButtons
            currentId={audioReference.id}
            videoId={audioReference.videoId}
            tags={audioReference.tags || []}
          />
        </Suspense>
      </div>
    </div>
  );
}
