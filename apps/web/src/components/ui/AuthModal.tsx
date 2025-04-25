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
  const [isOpen, setIsOpen] = useState(false); // 初期値をfalseに変更
  const [isProcessing, setIsProcessing] = useState(true);
  // 認証コードを検出したかどうかを追跡
  const [authCodeDetected, setAuthCodeDetected] = useState(false);
  // 認証コードを保持
  const [authCode, setAuthCode] = useState<string | null>(null);

  // 認証コードの検出とモーダル表示の制御
  useEffect(() => {
    // テスト環境でのエラーを回避するための処理
    if (typeof window === "undefined") {
      // サーバーサイドレンダリング時またはテスト環境では何もしない
      setIsOpen(false);
      return;
    }

    // URLパラメーターのロギングを追加（デバッグ用）
    console.log("現在のURL:", window.location.href);
    console.log("検索パラメーター:", Object.fromEntries(new URLSearchParams(window.location.search).entries()));

    // 1. まず、URLから直接認証コードを取得を試みる
    const code = searchParams.get("discord_code");
    console.log("SearchParamsから取得したdiscord_code:", code);

    // 2. URLから取得できなかった場合は、ブラウザURLから直接取得を試みる
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get("discord_code");
    console.log("window.location.searchから直接取得したdiscord_code:", codeFromUrl);

    // 3. セッションストレージから認証コードを取得（バックアップとして）
    let codeFromSession: string | null = null;
    try {
      codeFromSession = sessionStorage.getItem("discord_auth_code");
      console.log("セッションストレージから取得したdiscord_auth_code:", codeFromSession);
    } catch (e) {
      console.error("セッションストレージからの読み取りに失敗しました:", e);
    }

    // どの方法でも取得できた認証コードを使用
    const effectiveCode = code || codeFromUrl || codeFromSession;

    if (!effectiveCode) {
      // コードがない場合はモーダルを表示しない
      console.log("認証コードが見つかりませんでした。モーダルは表示されません。");
      setIsOpen(false);
      return;
    }

    console.log("認証コードを検出しました:", effectiveCode);
    // 認証コードを状態に保存
    setAuthCode(effectiveCode);
    // 認証コードを検出したフラグを設定
    setAuthCodeDetected(true);
    // モーダルを表示（認証処理を開始する前に必ず表示）
    setIsOpen(true);
    setIsProcessing(true);
    setMessage("認証処理を開始します...");

  }, [searchParams]);

  // 認証コードが検出された場合の処理
  useEffect(() => {
    if (!authCodeDetected || !authCode) {
      return;
    }

    // URLから認証コードを削除する関数（認証処理の最後に呼び出す）
    const removeCodeFromUrl = () => {
      // 現在のパス名のみを保持し、クエリパラメータを削除
      if (typeof window !== "undefined") {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    };

    // セッションストレージからコードを削除（認証処理の最後に呼び出す）
    const removeCodeFromSession = () => {
      try {
        sessionStorage.removeItem("discord_auth_code");
        console.log("セッションストレージからコードを削除しました");
      } catch (e) {
        console.error("セッションストレージからの削除に失敗しました:", e);
      }
    };

    async function processAuth() {
      try {
        // モーダルを表示し続ける
        setIsOpen(true);
        setIsProcessing(true);
        
        // コードの存在を確認（コンパイルエラー対策）
        if (!authCode) {
          setError("認証コードが見つかりません。");
          setMessage("認証に失敗しました。");
          setIsProcessing(false);
          return;
        }
        
        console.log("認証処理に使用するコード:", authCode);
        setMessage("認証サーバーと通信中...");
        
        // Server Actionを呼び出して認証処理
        console.log("Server Actionを呼び出し中...");
        try {
          // authCodeがstring型であることをTypeScriptに保証
          const result = await handleDiscordCallback(authCode);
          console.log("Server Action結果:", result);

          if (!result.success || !result.customToken) {
            // エラーメッセージを日本語化
            let errorMessage = "認証処理に失敗しました";
            
            // 特定のエラーメッセージを日本語に変換
            if (result.error === "Guild membership required.") {
              errorMessage = "Discordサーバーのメンバーである必要があります。Discordサーバーに参加してから再度お試しください。";
            } else if (result.error) {
              errorMessage = result.error;
            }
            
            // エラー表示
            setError(errorMessage);
            setMessage("認証に失敗しました。");
            setIsProcessing(false);
            
            // コードをクリーンアップ
            removeCodeFromUrl();
            removeCodeFromSession();
            return;
          }

          // authがnullでないことを確認
          if (!auth) {
            setError("認証システムの初期化に失敗しました。");
            setMessage("認証に失敗しました。");
            setIsProcessing(false);
            
            // コードをクリーンアップ
            removeCodeFromUrl();
            removeCodeFromSession();
            return;
          }

          setMessage("Firebaseにサインイン中...");
          
          // カスタムトークンでサインイン
          console.log("Firebaseカスタムトークンでサインイン中...");
          try {
            await signInWithCustomToken(auth, result.customToken);
            console.log("Firebaseサインイン成功");
            
            setMessage("認証に成功しました！");
            setIsProcessing(false);
            
            // 認証コードの検出フラグをリセット
            setAuthCodeDetected(false);
            setAuthCode(null);
            
            // コードをクリーンアップ
            removeCodeFromUrl();
            removeCodeFromSession();
            
            // 3秒後にモーダルを閉じる
            setTimeout(() => {
              setIsOpen(false);
            }, 3000);
            
          } catch (signInError) {
            console.error("Firebaseサインイン中にエラーが発生しました:", signInError);
            const signInErrorMessage = signInError instanceof Error
              ? signInError.message
              : "認証中に予期せぬエラーが発生しました。";
            setError(signInErrorMessage);
            setMessage("認証に失敗しました。");
            setIsProcessing(false);
            
            // コードをクリーンアップ
            removeCodeFromUrl();
            removeCodeFromSession();
          }
        } catch (serverActionError) {
          console.error("Server Action呼び出し中にエラーが発生しました:", serverActionError);
          const serverActionErrorMessage = serverActionError instanceof Error
            ? serverActionError.message
            : "サーバーとの通信中にエラーが発生しました。";
          setError(serverActionErrorMessage);
          setMessage("認証に失敗しました。");
          setIsProcessing(false);
          
          // コードをクリーンアップ
          removeCodeFromUrl();
          removeCodeFromSession();
        }
      } catch (err) {
        // 全体的なエラーハンドリング
        console.error("認証処理中にエラーが発生しました:", err);
        const errorMessage = err instanceof Error
          ? err.message
          : "認証中に予期せぬエラーが発生しました。";
        setError(errorMessage);
        setMessage("認証に失敗しました。");
        setIsProcessing(false);
        
        // コードをクリーンアップ
        removeCodeFromUrl();
        removeCodeFromSession();
      }
    }

    // 認証処理を開始
    processAuth();
  }, [authCodeDetected, authCode]);

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