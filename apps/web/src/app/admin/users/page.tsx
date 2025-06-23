import { Suspense } from "react";
import { getUserStats, getUsers } from "./actions";
import UserList from "./components/UserList";
import UserStats from "./components/UserStats";

interface AdminUsersProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminUsers({ searchParams }: AdminUsersProps) {
  const resolvedSearchParams = await searchParams;
  const roleParam = resolvedSearchParams.role;
  const searchParam = resolvedSearchParams.search;
  const sortParam = resolvedSearchParams.sort;

  const role =
    roleParam && typeof roleParam === "string"
      ? (roleParam as "member" | "moderator" | "admin")
      : undefined;

  const searchText =
    searchParam && typeof searchParam === "string" ? searchParam : undefined;

  const sortBy =
    sortParam && typeof sortParam === "string"
      ? (sortParam as "newest" | "oldest" | "mostActive" | "alphabetical")
      : "newest";

  // 並行してデータを取得
  const [initialData, stats] = await Promise.all([
    getUsers({
      limit: 20,
      role,
      searchText,
      sortBy,
      onlyPublic: false,
    }),
    getUserStats(),
  ]);

  return (
    <div>
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="text-gray-600 mt-2">
            ユーザーの管理、ロール変更、アクティブ状態の管理
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 統計情報 */}
        <UserStats stats={stats} />

        {/* フィルター・検索 */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <form
            method="GET"
            className="space-y-4 md:space-y-0 md:flex md:items-end md:space-x-4"
          >
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">
                検索
                <input
                  type="text"
                  name="search"
                  defaultValue={searchText}
                  placeholder="ユーザー名、表示名で検索..."
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                ロール
                <select
                  name="role"
                  defaultValue={role || ""}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  <option value="member">メンバー</option>
                  <option value="moderator">モデレーター</option>
                  <option value="admin">管理者</option>
                </select>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                並び順
                <select
                  name="sort"
                  defaultValue={sortBy}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="newest">新しい順</option>
                  <option value="oldest">古い順</option>
                  <option value="mostActive">アクティブ順</option>
                  <option value="alphabetical">名前順</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              フィルター
            </button>
          </form>
        </div>

        {/* ユーザー一覧 */}
        <Suspense
          fallback={
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="mt-2 text-gray-600">読み込み中...</p>
            </div>
          }
        >
          <UserList data={initialData} currentPage={1} />
        </Suspense>
      </main>
    </div>
  );
}
