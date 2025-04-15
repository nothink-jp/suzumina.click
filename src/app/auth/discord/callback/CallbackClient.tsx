"use client"; // クライアントコンポーネント

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

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

    const functionsUrl =
      process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_AUTH_CALLBACK_URL ||
      "http://127.0.0.1:5001/suzumina-click-firebase/asia-northeast1/discordAuthCallback";

    if (!functionsUrl) {
      console.error("Functions URL environment variable is not set.");
      setError("サーバー設定エラーが発生しました。");
      setMessage("エラーが発生しました。");
      return;
    }

    fetch(functionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ error: "不明なサーバーエラー" }));
          throw new Error(errorData.error || `サーバーエラー (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (!data.success || !data.customToken) {
          throw new Error(
            data.error || "カスタムトークンの取得に失敗しました。",
          );
        }
        
        // authがnullでないことを確認
        if (!auth) {
          throw new Error("認証システムの初期化に失敗しました。");
        }
        
        return signInWithCustomToken(auth, data.customToken);
      })
      .then(() => {
        setMessage("認証に成功しました！ホームページにリダイレクトします...");
        router.push("/");
      })
      .catch((err) => {
        console.error("Authentication failed:", err);
        setError(err.message || "認証中にエラーが発生しました。");
        setMessage("認証に失敗しました。");
      });
  }, [searchParams, router]);

  // UI 部分は page.tsx から移動
  return (
    <>
      <p>{message}</p>
      {error && <p className="text-error mt-2">エラー: {error}</p>}
      {!error && message === "認証処理中..." && (
        <span className="loading loading-dots loading-lg mt-4" />
      )}
    </>
  );
}
