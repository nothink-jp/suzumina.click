import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">suzumina.click</h1>
          <p className="text-gray-600 mt-2">涼花みなせファンサイトへようこそ</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            コンテンツ
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <Link
              href="/admin/videos"
              className="block p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <h3 className="text-xl font-medium text-blue-900 mb-2">
                動画管理
              </h3>
              <p className="text-blue-700">YouTube動画の一覧と管理機能</p>
            </Link>

            <div className="block p-6 bg-gray-50 border border-gray-200 rounded-lg opacity-50">
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                DLsite作品
              </h3>
              <p className="text-gray-500">DLsite作品情報（開発予定）</p>
            </div>

            <div className="block p-6 bg-gray-50 border border-gray-200 rounded-lg opacity-50">
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                音声ボタン
              </h3>
              <p className="text-gray-500">音声ボタン機能（開発予定）</p>
            </div>

            <div className="block p-6 bg-gray-50 border border-gray-200 rounded-lg opacity-50">
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                検索機能
              </h3>
              <p className="text-gray-500">
                高度な検索・フィルター（開発予定）
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
