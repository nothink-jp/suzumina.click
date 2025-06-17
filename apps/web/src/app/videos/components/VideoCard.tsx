import ThumbnailImage from "@/components/ThumbnailImage";
import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import { Badge } from "@suzumina.click/ui/components/badge";
import { Button } from "@suzumina.click/ui/components/button";
import { Calendar, Clock, ExternalLink, Eye, Plus } from "lucide-react";
import Link from "next/link";

interface VideoCardProps {
  video: FrontendVideoData;
  buttonCount?: number;
  variant?: "grid" | "sidebar";
}

export default function VideoCard({
  video,
  buttonCount = 0,
  variant = "grid",
}: VideoCardProps) {
  const isGrid = variant === "grid";

  // ISO形式の日付を表示用にフォーマット
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  // YouTube動画URLを生成
  const youtubeUrl = `https://youtube.com/watch?v=${video.videoId}`;

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow group border border-gray-200">
      <div className="relative">
        <Link href={`/videos/${video.id}`} className="block relative">
          <ThumbnailImage
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full aspect-video object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute bottom-2 right-2">
            <Badge className="bg-black/70 text-white">
              <Clock className="h-3 w-3 mr-1" />
              動画
            </Badge>
          </div>
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-white/90 text-suzuka-700">
              {buttonCount} ボタン
            </Badge>
          </div>
        </Link>
      </div>
      <div className="p-4">
        <Link href={`/videos/${video.id}`} className="block group">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-suzuka-600 transition-colors text-suzuka-800">
            {video.title}
          </h3>
        </Link>
        <p className="text-sm text-suzuka-600 mb-3 line-clamp-2">
          {video.description}
        </p>
        <div className="flex items-center text-sm text-suzuka-500 mb-3">
          <Calendar className="h-4 w-4 mr-1" />
          {formatDate(video.publishedAt)}
        </div>

        {/* アクションボタン */}
        {isGrid ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-suzuka-300 text-suzuka-600 hover:bg-suzuka-50"
              asChild
            >
              <Link href={`/videos/${video.id}`}>
                <Eye className="h-4 w-4 mr-1" />
                詳細を見る
              </Link>
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-suzuka-500 hover:bg-suzuka-600 text-white"
              asChild
            >
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                YouTube
              </a>
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-suzuka-300 text-suzuka-600 hover:bg-suzuka-50"
            asChild
          >
            <Link href={`/videos/${video.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              動画を見る
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
