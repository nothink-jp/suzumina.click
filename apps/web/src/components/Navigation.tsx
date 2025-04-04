"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Fragment } from "react";

export function Navigation() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  return (
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
            {status === "loading" ? (
              <Fragment />
            ) : userId ? (
              <div className="flex items-center space-x-4">
                <Link
                  href={`/users/${userId}`}
                  className="text-sm text-gray-700 hover:text-gray-500"
                >
                  プロフィール
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-sm text-gray-700 hover:text-gray-500"
                >
                  ログアウト
                </button>
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
  );
}
