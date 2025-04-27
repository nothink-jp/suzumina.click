import VideoList from "../_components/VideoList";

/**
 * 動画一覧ページ
 * すべての動画を一覧表示する
 */
export const dynamic = "force-dynamic";

export default function VideosPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">動画一覧</h1>
        <p className="text-gray-600 mt-2">
          涼花みなせさんの動画をすべて一覧表示しています
        </p>
      </div>

      {/* 動画一覧（全件表示） */}
      <VideoList />
    </main>
  );
}
