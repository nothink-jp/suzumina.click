"use client";

import { useSession } from "next-auth/react";

/**
 * ログインユーザーの情報を表示するクライアントコンポーネント。
 * useSession フックを使用してセッション情報を取得します。
 */
export function UserInfoDisplay() {
  const { data: session, status } = useSession();

  // ローディング中は何も表示しない
  if (status === "loading") {
    return null;
  }

  // 認証されていない場合は何も表示しない
  if (status === "unauthenticated" || !session?.user) {
    return null;
  }

  // 認証済みの場合、ユーザー情報を表示
  return (
    <div className="mt-8 p-4 border rounded bg-gray-50 text-left">
      <h2 className="text-xl font-semibold mb-2">ログイン情報 (Client Side)</h2>
      <pre className="text-sm overflow-auto">
        {JSON.stringify(session.user, null, 2)}
      </pre>
    </div>
  );
}
