import { Suspense } from "react";
import { getWorks } from "./actions";
import WorkList from "./components/WorkList";

interface AdminWorksProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function AdminWorks({ searchParams }: AdminWorksProps) {
  // ページ番号の検証と変換
  const resolvedSearchParams = await searchParams;
  const pageParam = resolvedSearchParams.page;
  const parsedPage = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const validPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  // Server Actionでデータ取得
  const result = await getWorks({ page: validPage, limit: 100 });
  const { works: initialData, totalCount } = result;

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">DLsite作品管理</h1>
        <p className="mt-2 text-gray-600">
          涼花みなせさんが出演されているDLsite作品の一覧を管理できます
        </p>
      </header>

      <main>
        <Suspense
          fallback={
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="mt-2 text-gray-600">作品データを読み込み中...</p>
            </div>
          }
        >
          <WorkList
            data={initialData}
            totalCount={totalCount || 0}
            currentPage={validPage}
          />
        </Suspense>
      </main>
    </div>
  );
}

// メタデータ設定
export const metadata = {
  title: "DLsite作品管理 | suzumina.click",
  description: "涼花みなせさんが出演されているDLsite作品の管理画面",
};
