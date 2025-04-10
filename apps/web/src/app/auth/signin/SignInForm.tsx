"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * サインインフォームとロジックを含むクライアントコンポーネント。
 * useSearchParams を使用して callbackUrl を取得し、サインイン処理を実行します。
 * @returns サインインボタンを含む React 要素。
 */
export function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  /**
   * Discord でのサインイン処理を開始するコールバック関数。
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
  }, [callbackUrl]);

  return (
    <button
      type="button"
      onClick={handleSignIn}
      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
    >
      Discordでログイン
    </button>
  );
}
