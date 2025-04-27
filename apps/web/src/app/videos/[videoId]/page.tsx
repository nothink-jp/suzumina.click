import Link from "next/link";
import { notFound } from "next/navigation";
import YouTubeEmbed from "@/components/videos/YouTubeEmbed";
import VideoInfo from "@/components/videos/VideoInfo";
import { getVideoById } from "@/lib/videos/api";

/**
 * 動的レンダリングを有効化
 * データ取得のため必要
 */
export const dynamic = "force-dynamic";

interface VideoPageProps {
  params: {
    videoId: string;
  };
}

/**
 * 動画詳細ページ
 * URLパラメータから動画IDを取得し、その動画の詳細を表示する
 */
export default async function VideoPage({ params }: VideoPageProps) {
  const { videoId } = params;
  
  // 動画情報を取得
  const video = await getVideoById(videoId);
  
  // 動画が見つからない場合は404
  if (!video) {
    notFound();
  }
  
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/" className="btn btn-ghost">
          ← 動画一覧に戻る
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* YouTube動画プレイヤー */}
          <YouTubeEmbed videoId={video.id} title={video.title} />
          
          {/* 動画情報 */}
          <div className="mt-6">
            <VideoInfo video={video} />
          </div>
        </div>
        
        <div className="lg:col-span-1">
          {/* 将来的に音声クリップボタンを表示するエリア */}
          <div className="p-6 bg-base-200 rounded-lg">
            <h2 className="text-xl font-bold mb-4">音声クリップ</h2>
            <p className="text-gray-500">
              この機能は現在開発中です。将来的にはこの動画から抽出した特定フレーズを再生できるようになります。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}