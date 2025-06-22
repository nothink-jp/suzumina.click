import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import { Badge } from "@suzumina.click/ui/components/badge";
import { Button } from "@suzumina.click/ui/components/button";
import { Calendar, Clock, ExternalLink, Eye, Plus } from "lucide-react";
import Link from "next/link";
import { memo, useMemo } from "react";
import ThumbnailImage from "@/components/ThumbnailImage";

interface VideoCardProps {
  video: FrontendVideoData;
  buttonCount?: number;
  variant?: "grid" | "sidebar";
  priority?: boolean; // LCP画像最適化用
}

// パフォーマンス向上: VideoCardをメモ化して不要な再レンダリングを防ぐ
const VideoCard = memo(function VideoCard({
  video,
  buttonCount = 0,
  variant = "grid",
  priority = false,
}: VideoCardProps) {
  const isGrid = variant === "grid";

  // メモ化: 日付フォーマットを最適化
  const formattedDate = useMemo(() => {
    try {
      const date = new Date(video.publishedAt);
      return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return video.publishedAt;
    }
  }, [video.publishedAt]);

  // メモ化: YouTube URLを最適化
  const _youtubeUrl = useMemo(
    () => `https://youtube.com/watch?v=${video.videoId}`,
    [video.videoId],
  );

  return (
    <article
      className="hover:shadow-lg transition-shadow group border bg-card text-card-foreground rounded-lg shadow-sm"
      aria-labelledby={`video-title-${video.id}`}
    >
      <div className="p-0">
        <div className="relative">
          <Link
            href={`/videos/${video.id}`}
            className="block relative"
            aria-describedby={`video-desc-${video.id}`}
          >
            <ThumbnailImage
              src={video.thumbnailUrl}
              alt={`${video.title}のサムネイル画像`}
              className="w-full rounded-t-lg group-hover:scale-105 transition-transform duration-300"
              priority={priority}
              width={384}
              height={216}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute bottom-2 right-2">
              <Badge
                className="bg-black/70 text-white"
                aria-label="動画コンテンツ"
              >
                <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                動画
              </Badge>
            </div>
            <div className="absolute top-2 left-2">
              <Badge
                variant="secondary"
                className="bg-white/90 text-foreground"
                aria-label={`${buttonCount}個の音声ボタンが作成されています`}
              >
                {buttonCount} ボタン
              </Badge>
            </div>
          </Link>
        </div>
        <div className="p-4">
          <Link href={`/videos/${video.id}`} className="block group">
            <h3
              id={`video-title-${video.id}`}
              className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-foreground/80 transition-colors text-foreground"
            >
              {video.title}
            </h3>
          </Link>
          <p
            id={`video-desc-${video.id}`}
            className="text-sm text-muted-foreground mb-3 line-clamp-2"
          >
            {video.description}
          </p>
          <div className="flex items-center text-sm text-muted-foreground mb-3">
            <Calendar className="h-4 w-4 mr-1" aria-hidden="true" />
            <time
              dateTime={video.publishedAt}
              title={`公開日: ${formattedDate}`}
            >
              {formattedDate}
            </time>
          </div>

          {/* アクションボタン */}
          {isGrid ? (
            <fieldset className="flex gap-2" aria-label="動画アクション">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border text-muted-foreground hover:bg-accent min-h-[44px]"
                asChild
              >
                <Link
                  href={`/videos/${video.id}`}
                  aria-describedby={`video-title-${video.id}`}
                >
                  <Eye className="h-4 w-4 mr-1" aria-hidden="true" />
                  詳細を見る
                </Link>
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-primary hover:bg-primary/90 text-white min-h-[44px]"
                asChild
              >
                <Link
                  href={`/buttons/create?video_id=${video.id}`}
                  aria-label={`${video.title}の音声ボタンを作成`}
                >
                  <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                  ボタン作成
                </Link>
              </Button>
            </fieldset>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full border text-muted-foreground hover:bg-accent min-h-[44px]"
              asChild
            >
              <Link
                href={`/videos/${video.id}`}
                aria-describedby={`video-title-${video.id}`}
              >
                <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
                動画を見る
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
});

export default VideoCard;
