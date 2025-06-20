import type { VideoListResult } from "@suzumina.click/shared-types/src/video";
import AdminList from "@/components/AdminList";

interface VideoListProps {
  data: VideoListResult;
  totalCount: number;
  currentPage: number;
}

// Server Component版のVideoList（統一コンポーネント使用）
export default function VideoList({
  data,
  totalCount,
  currentPage,
}: VideoListProps) {
  return (
    <AdminList
      items={data.videos}
      totalCount={totalCount}
      currentPage={currentPage}
      title="動画一覧"
      type="video"
      emptyMessage="動画が見つかりませんでした"
    />
  );
}
