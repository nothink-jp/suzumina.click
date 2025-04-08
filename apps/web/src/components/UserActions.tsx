"use client";

import { Button } from "@suzumina.click/ui"; // Updated to root import
import { signOut } from "next-auth/react";
import Link from "next/link";
// import { Fragment } from "react"; // Fragment のインポートを削除

interface UserActionsProps {
  status: "loading" | "authenticated" | "unauthenticated";
  userId?: string;
}

/**
 * ナビゲーションバーのユーザー関連アクション（ログイン/ログアウト/プロフィール）を表示します。
 */
export function UserActions({ status, userId }: UserActionsProps) {
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
          onPress={() => signOut()} // Changed from onClick to onPress
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
