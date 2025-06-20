"use client";

import type { FrontendAudioReferenceData } from "@suzumina.click/shared-types/src/audio-reference";
import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import { Badge } from "@suzumina.click/ui/components/badge";
import { Button } from "@suzumina.click/ui/components/button";
import { Calendar, Clock, ExternalLink, Eye, Plus, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAudioReferences } from "@/app/buttons/actions";
import { AudioReferenceCard } from "@/components/AudioReferenceCard";
import ThumbnailImage from "@/components/ThumbnailImage";

interface VideoDetailProps {
  video: FrontendVideoData;
}

export default function VideoDetail({ video }: VideoDetailProps) {
  const [audioReferences, setAudioReferences] = useState<
    FrontendAudioReferenceData[]
  >([]);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioCount, setAudioCount] = useState(0);

  // 音声ボタンを取得
  useEffect(() => {
    const fetchAudioReferences = async () => {
      setAudioLoading(true);
      try {
        const result = await getAudioReferences({
          videoId: video.videoId,
          limit: 6,
          sortBy: "newest",
        });

        if (result.success) {
          setAudioReferences(result.data.audioReferences);
          setAudioCount(result.data.audioReferences.length);
        }
      } catch (error) {
        console.error("音声ボタン取得エラー:", error);
      } finally {
        setAudioLoading(false);
      }
    };

    fetchAudioReferences();
  }, [video.videoId]);

  // ISO形式の日付を表示用にフォーマット
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  // YouTube動画URLを生成
  const youtubeUrl = `https://youtube.com/watch?v=${video.videoId}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: video.description,
        url: window.location.href,
      });
    } else {
      // フォールバック: URLをクリップボードにコピー
      navigator.clipboard.writeText(window.location.href);
      alert("URLをクリップボードにコピーしました");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* パンくずリスト */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2 text-gray-600">
          <li>
            <Link href="/" className="hover:text-foreground/80">
              ホーム
            </Link>
          </li>
          <li>
            <span className="mx-2">/</span>
          </li>
          <li>
            <Link href="/videos" className="hover:text-foreground/80">
              動画一覧
            </Link>
          </li>
          <li>
            <span className="mx-2">/</span>
          </li>
          <li className="text-gray-800 font-medium truncate">{video.title}</li>
        </ol>
      </nav>

      {/* メインコンテンツ */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* サムネイル */}
        <div className="relative">
          <ThumbnailImage
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-80 object-cover"
          />
          <div className="absolute bottom-4 right-4">
            <Badge className="bg-black/70 text-white">
              <Clock className="h-4 w-4 mr-1" />
              動画
            </Badge>
          </div>
        </div>

        {/* 動画情報 */}
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {video.title}
          </h1>

          {/* メタ情報 */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDate(video.publishedAt)}
            </div>
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-1" />
              チャンネル: {video.channelTitle}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              asChild
            >
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                YouTubeで見る
              </a>
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              共有
            </Button>
          </div>

          {/* 説明 */}
          {video.description && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                動画の説明
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                  {video.description}
                </p>
              </div>
            </div>
          )}

          {/* 音声ボタンセクション */}
          <div className="mt-8 p-6 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                音声ボタン
              </h3>
              {audioCount > 0 && (
                <span className="text-sm text-blue-600">
                  {audioCount}個の音声ボタン
                </span>
              )}
            </div>

            {audioLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">音声ボタンを読み込み中...</p>
              </div>
            ) : audioReferences.length > 0 ? (
              <div className="space-y-4">
                <p className="text-gray-700">
                  この動画から作成された音声ボタンがあります。
                </p>

                {/* 音声ボタン一覧 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {audioReferences.map((audioReference) => (
                    <AudioReferenceCard
                      key={audioReference.id}
                      audioReference={audioReference}
                      showSourceVideo={false}
                      size="sm"
                      variant="compact"
                    />
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button asChild>
                    <Link href={`/buttons?videoId=${video.videoId}`}>
                      すべての音声ボタンを見る
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/buttons/create?video_id=${video.videoId}`}>
                      <Plus className="h-4 w-4 mr-2" />
                      新しい音声ボタンを作成
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  この動画からの音声ボタンはまだ作成されていません。
                </p>
                <Button asChild>
                  <Link href={`/buttons/create?video_id=${video.videoId}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    音声ボタンを作成
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
