"use client";

import { auth } from "@/lib/firebase/client";
import { signInWithCustomToken } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { handleDiscordCallback } from "@/app/api/auth/discord/actions";

export default function AuthModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("認証処理中...");
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    // テスト環境でのエラーを回避するための処理
    if (typeof window === "undefined") {
      // サーバーサイドレンダリング時またはテスト環境では何もしない
      setIsOpen(false);
      return;
    }

    const code = searchParams.get("discord_code");

    if (!code) {
      // コードがない場合はモーダルを表示しない
      setIsOpen(false);
      return;
    }

    console.log("認証コードを検出しました:", code);

    async function processAuth() {
      try {
        setIsProcessing(true);
        
        // TypeScriptエラーを修正するため、codeがnullでないことを確認
        // （上のif文で既にチェックしているが、TypeScriptはこのスコープでは認識できない）
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
        
        setMessage("認証に成功しました！");
        
        // 認証コードをURLから削除
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // 認証成功後もモーダルを表示し続ける
        // ユーザーが「閉じる」ボタンをクリックするまでモーダルを表示
      } catch (err: unknown) {
        console.error("Authentication failed:", err);
        // エラーメッセージの取得
        const errorMessage = err instanceof Error
          ? err.message
          : "認証中にエラーが発生しました。";
        setError(errorMessage);
        setMessage("認証に失敗しました。");
      } finally {
        setIsProcessing(false);
      }
    }

    processAuth();
  }, [searchParams, router]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Discord認証</h2>
        <div className="text-center py-4">
          <p>{message}</p>
          {error && (
            <div className="text-error mt-2">
              <p>エラーが発生しました。</p>
              <p>{error}</p>
            </div>
          )}
          {isProcessing && (
            <span className="loading loading-dots loading-lg mt-4" />
          )}
        </div>
        {!isProcessing && (
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn btn-sm"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
}