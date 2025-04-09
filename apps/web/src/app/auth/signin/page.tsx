"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

// Button のインポートを削除
// import { Button } from "@heroui/react";

/**
 * サインインページコンポーネント。
 * Discord ログインボタンを表示し、クリック時に NextAuth の signIn 関数を呼び出します。
 * ログイン後のリダイレクト先 URL (callbackUrl) をクエリパラメータから取得します。
 * @returns サインインページの React 要素。
 */
export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  /**
   * Discord でのサインイン処理を開始するコールバック関数。
   * useCallback を使用してパフォーマンスを最適化しています。
   */
  const handleSignIn = useCallback(async () => {
    try {
      await signIn("discord", {
        callbackUrl, // ログイン後のリダイレクト先
      });
    } catch (error) {
      console.error("Failed to sign in:", error);
      // 必要に応じてユーザーへのエラー通知を追加
    }
  }, [callbackUrl]); // callbackUrl が変更された場合のみ関数を再生成

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            すずみなふぁみりー
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Discordアカウントでログインしてください
            {/* 不要な Button を削除 */}
            {/* <Button>home</Button> */}
          </p>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={handleSignIn} // 最適化されたコールバックを使用
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            Discordでログイン
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            ログインには「すずみなふぁみりー」Discordサーバーのメンバーである必要があります
          </p>
        </div>
      </div>
    </div>
  );
}
