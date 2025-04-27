import type { Video } from "@/lib/videos/types";
import { formatDate } from "@/utils/date-format";

interface VideoInfoProps {
  video: Video;
}

/**
 * 動画情報表示コンポーネント
 * 動画のタイトル、公開日、チャンネル名、説明文などを表示する
 */
export default function VideoInfo({ video }: VideoInfoProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{video.title}</h1>

      <div className="flex items-center text-sm text-gray-500">
        <span>{formatDate(video.publishedAt)}</span>
        <span className="mx-2">•</span>
        <span>{video.channelTitle}</span>
      </div>

      <div className="pt-4 border-t">
        <h2 className="text-lg font-semibold mb-2">説明</h2>
        <p className="whitespace-pre-line">{video.description}</p>
      </div>
    </div>
  );
}
