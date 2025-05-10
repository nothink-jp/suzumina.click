import { getRecentVideos } from "@/actions/videos/actions";
import VideoCard from "@/components/ui/VideoCard";
import type { FrontendVideoData } from "@suzumina.click/shared-types";

interface VideoCarouselProps {
  /**
   * 表示する動画の最大数
   */
  limit?: number;
}

/**
 * 動画カルーセルコンポーネント
 * 指定された件数の最新動画をカルーセル形式で表示する
 */
export default async function VideoCarousel({
  limit = 10,
}: VideoCarouselProps) {
  // サーバーサイドで動画データを取得
  const { videos } = await getRecentVideos({ limit });

  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-bold mb-4">最新動画</h2>

      {/* daisyUIのカルーセルコンポーネント */}
      <div className="carousel carousel-center w-full p-4 space-x-4 bg-base-200 rounded-box">
        {videos.map((video: FrontendVideoData) => (
          <div key={video.id} className="carousel-item w-72 md:w-80">
            <VideoCard video={video} />
          </div>
        ))}
      </div>
    </div>
  );
}
