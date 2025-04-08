"use client";

import { Button } from "@suzumina.click/ui/components/button";
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut()}
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
