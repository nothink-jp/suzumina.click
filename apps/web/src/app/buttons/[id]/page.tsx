import { AudioButtonCard } from "@/components/AudioButtonCard";
import {
  getAudioButtonById,
  getAudioButtonsByCategory,
} from "@/lib/firestore-audio";
import type { AudioButtonCategory } from "@suzumina.click/shared-types";
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
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Eye,
  FileAudio,
  Heart,
  Play,
  Share2,
  Tag,
  User,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { incrementPlayCount } from "../actions";

interface AudioButtonDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

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

async function RelatedAudioButtons({
  category,
  currentId,
}: { category: string; currentId: string }) {
  const relatedButtons = await getAudioButtonsByCategory(
    category as AudioButtonCategory,
    6,
  );
  const filteredButtons = relatedButtons.filter(
    (button) => button.id !== currentId,
  );

  if (filteredButtons.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>関連する音声ボタン</CardTitle>
        <CardDescription>
          同じカテゴリ「{getCategoryLabel(category)}」の音声ボタン
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredButtons.slice(0, 6).map((audioButton) => (
            <AudioButtonCard
              key={audioButton.id}
              audioButton={audioButton}
              showSourceVideo={false}
              size="sm"
              variant="compact"
            />
          ))}
        </div>
        {filteredButtons.length > 6 && (
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <Link href={`/buttons?category=${category}`}>
                {getCategoryLabel(category)}の音声ボタンをもっと見る
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AudioButtonDetailPage({
  params,
}: AudioButtonDetailPageProps) {
  const resolvedParams = await params;
  const audioButton = await getAudioButtonById(resolvedParams.id);

  if (!audioButton) {
    notFound();
  }

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

      <div className="space-y-8">
        {/* メイン情報 */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">
                  {audioButton.title}
                </CardTitle>
                {audioButton.description && (
                  <CardDescription className="text-base">
                    {audioButton.description}
                  </CardDescription>
                )}
              </div>
              <Badge variant="secondary" className="ml-4">
                {getCategoryLabel(audioButton.category)}
              </Badge>
            </div>

            {/* タグ */}
            {audioButton.tags && audioButton.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {audioButton.tags.map((tag) => (
                  <Badge key={tag} variant="outline" asChild>
                    <Link
                      href={`/buttons?tags=${encodeURIComponent(tag)}`}
                      className="cursor-pointer hover:bg-gray-100"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Link>
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 音声プレイヤー */}
            <div className="bg-gray-50 rounded-lg p-6">
              <AudioPlayer
                src={audioButton.audioUrl}
                title={audioButton.title}
                showTitle={false}
                showProgress={true}
                showVolume={true}
                showSkipButtons={true}
                showReplayButton={true}
                size="lg"
                variant="default"
                onPlay={async () => {
                  // 再生回数を増加（サーバーアクション）
                  try {
                    await incrementPlayCount(audioButton.id);
                  } catch (error) {
                    console.error("再生回数更新エラー:", error);
                  }
                }}
              />
            </div>

            {/* 統計情報 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Eye className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold text-blue-700">
                  {audioButton.playCount.toLocaleString()}
                </div>
                <div className="text-sm text-blue-600">再生回数</div>
              </div>

              <div className="text-center p-4 bg-red-50 rounded-lg">
                <Heart className="h-6 w-6 mx-auto mb-2 text-red-600" />
                <div className="text-2xl font-bold text-red-700">
                  {audioButton.likeCount.toLocaleString()}
                </div>
                <div className="text-sm text-red-600">いいね</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Volume2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold text-green-700">
                  {audioButton.durationText}
                </div>
                <div className="text-sm text-green-600">再生時間</div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <FileAudio className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold text-purple-700">
                  {audioButton.fileSizeText}
                </div>
                <div className="text-sm text-purple-600">ファイルサイズ</div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex gap-4">
              <Button className="flex-1">
                <Heart className="h-4 w-4 mr-2" />
                いいね
              </Button>
              <Button variant="outline" className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                共有
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 詳細情報 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* メタデータ */}
          <Card>
            <CardHeader>
              <CardTitle>詳細情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="font-medium">作成日時</div>
                  <div className="text-sm text-gray-600">
                    {getRelativeTime(audioButton.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="font-medium">音声形式</div>
                  <div className="text-sm text-gray-600">
                    {audioButton.format.toUpperCase()}
                  </div>
                </div>
              </div>

              {audioButton.uploadedBy && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium">作成者</div>
                    <div className="text-sm text-gray-600">
                      {audioButton.uploadedBy}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 元動画情報 */}
          {audioButton.sourceVideoId && (
            <Card>
              <CardHeader>
                <CardTitle>元動画情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="font-medium">動画タイトル</div>
                  <div className="text-sm text-gray-600">
                    {audioButton.sourceVideoTitle || "不明"}
                  </div>
                </div>

                {audioButton.startTime !== undefined &&
                  audioButton.endTime !== undefined && (
                    <div>
                      <div className="font-medium">切り抜き範囲</div>
                      <div className="text-sm text-gray-600">
                        {audioButton.startTime}秒 - {audioButton.endTime}秒 （
                        {audioButton.endTime - audioButton.startTime}秒間）
                      </div>
                    </div>
                  )}

                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href={`/videos/${audioButton.sourceVideoId}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    元動画を見る
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 関連音声ボタン */}
        <RelatedAudioButtons
          category={audioButton.category}
          currentId={audioButton.id}
        />
      </div>
    </div>
  );
}
