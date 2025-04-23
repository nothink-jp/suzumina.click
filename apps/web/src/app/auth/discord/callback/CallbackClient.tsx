"use client"; // クライアントコンポーネント

import { auth } from "@/lib/firebase/client";
import { signInWithCustomToken } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { handleDiscordCallback } from "@/app/api/auth/discord/actions";

export default function CallbackClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("認証処理中...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      setError("認証コードが見つかりません。");
      setMessage("エラーが発生しました。");
      return;
    }

    async function processAuth() {
      try {
        // codeがnullでないことを確認
        if (!code) {
          throw new Error("認証コードが見つかりません。");
        }
        
        // Server Actionを呼び出して認証処理
        const result = await handleDiscordCallback(code);

        if (!result.success || !result.customToken) {
          throw new Error(result.error || "認証処理に失敗しました");
        }

        // authがnullでないことを確認
        if (!auth) {
          throw new Error("認証システムの初期化に失敗しました。");
        }

        // カスタムトークンでサインイン
        await signInWithCustomToken(auth, result.customToken);
        
        setMessage("認証に成功しました！ホームページにリダイレクトします...");
        router.push("/");
      } catch (err: unknown) {
        console.error("Authentication failed:", err);
        // エラーメッセージの取得
        const errorMessage = err instanceof Error
          ? err.message
          : "認証中にエラーが発生しました。";
        setError(errorMessage);
        setMessage("認証に失敗しました。");
      }
    }

    processAuth();
  }, [searchParams, router]);

  // UI 部分は page.tsx から移動
  return (
    <>
      <p>{message}</p>
      {error && <p className="text-error mt-2">エラー: {error}</p>}
      {!error && message === "認証処理中..." && (
        <span
          data-testid="loading-indicator"
          className="loading loading-dots loading-lg mt-4"
        />
      )}
    </>
  );
}
