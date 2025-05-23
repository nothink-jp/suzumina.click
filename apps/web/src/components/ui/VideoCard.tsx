import type { Video } from "@/lib/videos/types";
import { formatDate } from "@/utils/date-format";
import Image from "next/image";
import Link from "next/link";

interface VideoCardProps {
  video: Video;
}

/**
 * 動画カードコンポーネント
 * 動画一覧で表示する各動画のカードを表示する
 */
export default function VideoCard({ video }: VideoCardProps) {
  return (
    <Link href={`/videos/${video.id}`} className="group w-full">
      <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-300 h-full">
        <figure className="relative w-full h-[180px] overflow-hidden">
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            priority
          />
        </figure>
        <div className="card-body p-4 min-h-[120px]">
          <h2 className="card-title text-lg line-clamp-2">{video.title}</h2>
          <p className="text-sm text-gray-500">
            {formatDate(video.publishedAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
