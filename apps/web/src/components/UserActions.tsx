"use client";

import { Button } from "@/components/ui"; // Updated import path
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useCallback } from "react"; // useCallback をインポート
// import { Fragment } from "react"; // Fragment のインポートを削除

interface UserActionsProps {
  status: "loading" | "authenticated" | "unauthenticated";
  userId?: string;
}

/**
 * ナビゲーションバーのユーザー関連アクション（ログイン/ログアウト/プロフィール）を表示します。
 */
export function UserActions({ status, userId }: UserActionsProps) {
  const handleSignOut = useCallback(() => {
    // useCallback でラップ
    signOut();
  }, []); // 依存配列は空

  if (status === "loading") {
    return null; // Fragment を null に変更
  }

  if (userId) {
    return (
      <div className="flex items-center space-x-4">
        <Link
          href={`/users/${userId}`}
          className="text-sm text-gray-700 hover:text-gray-500"
        >
          プロフィール
        </Link>
        {/* Use variant="light" for ghost style */}
        <Button
          variant="light" // Changed from "ghost"
          size="sm"
          onPress={handleSignOut} // useCallback でラップした関数を使用
          className="text-sm text-gray-700 hover:text-gray-500"
        >
          ログアウト
        </Button>
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
