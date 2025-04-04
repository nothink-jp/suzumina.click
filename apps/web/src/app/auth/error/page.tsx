import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "認証エラー - すずみなふぁみりー",
  description: "ログインに失敗しました",
};

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">認証エラー</h1>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600">
              ログインに失敗しました。以下の点を確認してください：
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-2">
              <li>「すずみなふぁみりー」Discordサーバーのメンバーですか？</li>
              <li>Discordでの認証を正しく許可しましたか？</li>
              <li>必要な権限を付与しましたか？</li>
            </ul>
          </div>

          <div className="mt-8 space-y-4">
            <Link
              href="/auth/signin"
              className="inline-block w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              ログインを再試行
            </Link>

            <Link
              href="/"
              className="inline-block w-full py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              トップページへ戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
