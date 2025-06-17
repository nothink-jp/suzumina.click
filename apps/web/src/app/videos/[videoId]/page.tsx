import { notFound } from "next/navigation";
import { getVideoById } from "../actions";
import VideoDetail from "./components/VideoDetail";

interface VideoDetailPageProps {
  params: Promise<{
    videoId: string;
  }>;
}

export default async function VideoDetailPage({
  params,
}: VideoDetailPageProps) {
  const resolvedParams = await params;
  const { videoId } = resolvedParams;

  const video = await getVideoById(videoId);

  if (!video) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <VideoDetail video={video} />
      </main>
    </div>
  );
}

// メタデータ生成
export async function generateMetadata({ params }: VideoDetailPageProps) {
  const resolvedParams = await params;
  const { videoId } = resolvedParams;

  const video = await getVideoById(videoId);

  if (!video) {
    return {
      title: "動画が見つかりません | suzumina.click",
    };
  }

  return {
    title: `${video.title} | suzumina.click`,
    description:
      video.description ||
      `涼花みなせさんの動画「${video.title}」の詳細ページです。`,
  };
}
