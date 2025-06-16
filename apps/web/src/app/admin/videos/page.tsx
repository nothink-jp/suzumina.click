import { getTotalVideoCount, getVideoTitles } from "@/app/actions";
import VideoList from "@/components/VideoList";
import { Suspense } from "react";

interface AdminVideosProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminVideos({ searchParams }: AdminVideosProps) {
  const resolvedSearchParams = await searchParams;
  const pageParam = resolvedSearchParams.page;
  const currentPage =
    pageParam && typeof pageParam === "string"
      ? Number.parseInt(pageParam, 10)
      : 1;
  const validPage = Math.max(1, Number.isNaN(currentPage) ? 1 : currentPage);

  // 並行してデータを取得
  const [initialData, totalCount] = await Promise.all([
    getVideoTitles({ page: validPage, limit: 10 }),
    getTotalVideoCount(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">動画管理</h1>
          <p className="text-gray-600 mt-2">涼花みなせの動画一覧 - 管理画面</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Suspense
          fallback={
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="mt-2 text-gray-600">読み込み中...</p>
            </div>
          }
        >
          <VideoList
            data={initialData}
            totalCount={totalCount}
            currentPage={validPage}
          />
        </Suspense>
      </main>
    </div>
  );
}
