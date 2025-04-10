import Link from "next/link";

/**
 * 404 Not Found ページコンポーネント。
 * ページが見つからない場合に表示されます。
 * @returns 404ページの React 要素。
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
      <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-600 mb-6">
        ページが見つかりませんでした
      </h2>
      <p className="text-gray-500 mb-8">
        お探しのページは移動または削除された可能性があります。
      </p>
      <Link
        href="/"
        className="rounded bg-blue-600 px-6 py-2 font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring active:bg-blue-500"
      >
        トップページへ戻る
      </Link>
    </div>
  );
}
