import { getRecentVideos } from "@/actions/videos/actions";
import VideoCard from "@/components/ui/VideoCard";
import CarouselNavigation from "@/components/videos/CarouselNavigation";
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

  const carouselId = "video-carousel";

  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-bold mb-4">最新動画</h2>

      {/* カルーセルコンテナ - 相対位置指定でナビゲーションボタンの配置基準とする */}
      <div className="relative">
        {/* daisyUIのカルーセルコンポーネント */}
        <div
          id={carouselId}
          className="carousel carousel-center w-full p-4 space-x-4 bg-base-200 rounded-box"
        >
          {videos.map((video: FrontendVideoData, index) => (
            <div
              id={`${carouselId}-item-${index}`}
              key={video.id}
              className="carousel-item w-72 md:w-80"
            >
              <VideoCard video={video} />
            </div>
          ))}
        </div>

        {/* カルーセルナビゲーション（クライアントコンポーネント） */}
        <CarouselNavigation carouselId={carouselId} itemCount={videos.length} />
      </div>
    </div>
  );
}
