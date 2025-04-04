import "./globals.css";
import { auth } from "@/auth";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "すずみなふぁみりー",
  description: "すずみなふぁみりーのコミュニティサイト",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen bg-gray-50">
          {/* ナビゲーションヘッダー */}
          <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <Link
                    href="/"
                    className="flex items-center px-2 py-2 text-gray-900 hover:text-gray-600"
                  >
                    <span className="text-lg font-medium">
                      すずみなふぁみりー
                    </span>
                  </Link>
                </div>

                <div className="flex items-center">
                  {session ? (
                    <div className="flex items-center space-x-4">
                      <Link
                        href={`/users/${session.user.id}`}
                        className="text-sm text-gray-700 hover:text-gray-500"
                      >
                        プロフィール
                      </Link>
                      <form
                        action="/api/auth/signout"
                        method="post"
                      >
                        <button
                          type="submit"
                          className="text-sm text-gray-700 hover:text-gray-500"
                        >
                          ログアウト
                        </button>
                      </form>
                    </div>
                  ) : (
                    <Link
                      href="/auth/signin"
                      className="text-sm text-gray-700 hover:text-gray-500"
                    >
                      ログイン
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </nav>

          {/* メインコンテンツ */}
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
