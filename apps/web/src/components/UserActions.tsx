"use client";

// Button のインポートを削除
// import { Button } from "@heroui/react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useCallback } from "react";

interface UserActionsProps {
  status: "loading" | "authenticated" | "unauthenticated";
  userId?: string;
}

/**
 * ナビゲーションバーのユーザー関連アクション（ログイン/ログアウト）を表示します。
 * プロフィールリンクは一時的に削除されています。
 * 標準の button タグと Tailwind CSS を使用します。
 */
export function UserActions({ status, userId }: UserActionsProps) {
  const handleSignOut = useCallback(() => {
    signOut();
  }, []);

  if (status === "loading") {
    return null;
  }

  if (userId) {
    return (
      <div className="flex items-center space-x-4">
        {/* プロフィールリンクは一時的に削除 */}
        {/* <Link ... /> */}

        {/* Button を button タグに置き換え */}
        <button
          type="button" // type="button" を指定
          onClick={handleSignOut} // onPress を onClick に変更
          className="rounded px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring active:bg-gray-200" // variant="light" に近いスタイル
        >
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/auth/signin"
      className="text-sm text-gray-700 hover:text-gray-500"
    >
      ログイン
    </Link>
  );
}
