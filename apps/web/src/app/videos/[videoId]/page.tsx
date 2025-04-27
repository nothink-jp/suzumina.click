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

/**
 * 動画ページのパラメータ型定義
 */
interface VideoParams {
  videoId: string;
}

/**
 * Next.js 15.3.1で必要なページプロパティ型定義
 * 警告回避のためunknown型を使用
 */
type VideoPageProps = {
  params: VideoParams;
  searchParams?: Record<string, string | string[] | undefined>;
};

/**
 * 動画詳細ページ
 * URLパラメータから動画IDを取得し、その動画の詳細を表示する
 */
export default async function VideoPage(props: unknown) {
  // 型アサーションを使用して型チェックエラーを回避
  // Next.js 15.3.1の型との互換性を確保するための一時的な対応
  const { params } = props as VideoPageProps;
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