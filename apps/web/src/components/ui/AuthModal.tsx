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
  // 認証コードを検出したかどうかを追跡
  const [authCodeDetected, setAuthCodeDetected] = useState(false);

  // 認証コードの検出とモーダル表示の制御
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
    // 認証コードを検出したフラグを設定
    setAuthCodeDetected(true);
    // モーダルを表示
    setIsOpen(true);

  }, [searchParams]);

  // 認証コードが検出された場合の処理
  useEffect(() => {
    if (!authCodeDetected) {
      return;
    }

    // URLから認証コードを削除する関数
    const removeCodeFromUrl = () => {
      // 現在のパス名のみを保持し、クエリパラメータを削除
      if (typeof window !== "undefined") {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    };

    async function processAuth() {
      try {
        setIsProcessing(true);
        
        const code = searchParams.get("discord_code");
        
        // TypeScriptエラーを修正するため、codeがnullでないことを確認
        if (!code) {
          // 例外をスローする代わりに、状態を直接更新
          setError("認証コードが見つかりません。");
          setMessage("認証に失敗しました。");
          // 認証失敗時もURLからコードを削除
          removeCodeFromUrl();
          // 認証失敗時はリダイレクトせず、モーダルを表示したまま
          setIsProcessing(false);
          // 認証処理完了後も強制的にモーダルを表示
          setIsOpen(true);
          return;
        }
        
        // Server Actionを呼び出して認証処理
        const result = await handleDiscordCallback(code);

        if (!result.success || !result.customToken) {
          // エラーメッセージを日本語化
          let errorMessage = "認証処理に失敗しました";
          
          // 特定のエラーメッセージを日本語に変換
          if (result.error === "Guild membership required.") {
            errorMessage = "Discordサーバーのメンバーである必要があります。Discordサーバーに参加してから再度お試しください。";
          } else if (result.error) {
            errorMessage = result.error;
          }
          
          // 例外をスローする代わりに、状態を直接更新
          setError(errorMessage);
          setMessage("認証に失敗しました。");
          // 認証失敗時もURLからコードを削除
          removeCodeFromUrl();
          // 認証失敗時はリダイレクトせず、モーダルを表示したまま
          setIsProcessing(false);
          // 認証処理完了後も強制的にモーダルを表示
          setIsOpen(true);
          return;
        }

        // authがnullでないことを確認
        if (!auth) {
          // 例外をスローする代わりに、状態を直接更新
          setError("認証システムの初期化に失敗しました。");
          setMessage("認証に失敗しました。");
          // 認証失敗時もURLからコードを削除
          removeCodeFromUrl();
          // 認証失敗時はリダイレクトせず、モーダルを表示したまま
          setIsProcessing(false);
          // 認証処理完了後も強制的にモーダルを表示
          setIsOpen(true);
          return;
        }

        // カスタムトークンでサインイン
        await signInWithCustomToken(auth, result.customToken);
        
        setMessage("認証に成功しました！");
        
        // 認証コードをURLから削除（関数に切り出し）
        removeCodeFromUrl();
        
        // 認証処理完了
        setIsProcessing(false);
        // 認証成功後もモーダルを表示し続ける
        setIsOpen(true);
        // 認証コードの検出フラグをリセット
        setAuthCodeDetected(false);
      } catch (err: unknown) {
        console.error("認証処理中にエラーが発生しました:", err);
        // エラーメッセージの取得
        const errorMessage = err instanceof Error
          ? err.message
          : "認証中に予期せぬエラーが発生しました。";
        setError(errorMessage);
        setMessage("認証に失敗しました。");
        // 例外発生時もURLからコードを削除
        removeCodeFromUrl();
        // 認証失敗時はリダイレクトせず、モーダルを表示したまま
        setIsProcessing(false);
        // 認証処理完了後も強制的にモーダルを表示
        setIsOpen(true);
      }
    }

    processAuth();
  }, [authCodeDetected, searchParams]);

  // モーダルが表示されていない場合は何も表示しない
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
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