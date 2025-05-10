"use client";

import {
  createSessionCookie,
  handleDiscordCallback,
} from "@/actions/auth/actions";
import { auth } from "@/lib/firebase/client";
import { signInWithCustomToken } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function AuthModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modalRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string>("認証処理中...");
  const [error, setError] = useState<string | null>(null);
  const [authCodeDetected, setAuthCodeDetected] = useState(false);
  const [authCode, setAuthCode] = useState<string | null>(null);

  // URL検索パラメータとセッションストレージからDiscord認証コードを検出
  useEffect(() => {
    // すでにコード検出済みの場合は処理しない
    if (authCodeDetected) return;

    // 1. まず、URLから直接認証コードを取得を試みる
    const code = searchParams.get("discord_code");

    // 2. URLから取得できなかった場合は、ブラウザURLから直接取得を試みる
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get("discord_code");

    // 3. セッションストレージから認証コードを取得（バックアップとして）
    let codeFromSession: string | null = null;
    try {
      codeFromSession = sessionStorage.getItem("discord_auth_code");
    } catch (e) {
      // セッションストレージからの読み取りに失敗
    }

    // どの方法でも取得できた認証コードを使用
    const detectedCode = code || codeFromUrl || codeFromSession;

    if (detectedCode) {
      setAuthCode(detectedCode);
      setAuthCodeDetected(true);
      setIsOpen(true);
      // 認証コードを検出したら処理を開始
      processAuth(detectedCode);
    }
  }, [searchParams, authCodeDetected]);

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
    } catch (e) {
      // セッションストレージからの削除に失敗
    }
  };

  async function processAuth(code: string) {
    try {
      // モーダルを表示し続ける
      setIsOpen(true);
      setIsProcessing(true);

      // コードの存在を確認
      if (!code) {
        setError("認証コードが見つかりません。");
        setMessage("認証に失敗しました。");
        setIsProcessing(false);
        return;
      }

      setMessage("認証サーバーと通信中...");

      // Firebase認証の状態を確認し、必要に応じて再取得
      let firebaseAuth = auth;
      if (!firebaseAuth) {
        // firebase/clientの認証を再取得
        firebaseAuth = auth;
      }

      try {
        // Server Actionを呼び出して認証処理
        const result = await handleDiscordCallback(code);

        if (!result.success || !result.customToken) {
          setError(result.error || "認証処理に失敗しました。");
          setMessage("認証に失敗しました。");
          setIsProcessing(false);

          // コードをクリーンアップ
          removeCodeFromUrl();
          removeCodeFromSession();
          return;
        }

        // もう一度Firebase認証オブジェクトを確認（念のため）
        if (!firebaseAuth) {
          // firebase/clientの認証を再取得
          firebaseAuth = auth;
        }

        // authがnullでないことを確認
        if (!firebaseAuth) {
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
        try {
          // カスタムトークンでFirebaseにサインイン
          await signInWithCustomToken(firebaseAuth, result.customToken);

          setMessage("セッション情報を同期中...");

          // IDトークンを取得してセッションクッキーを作成
          const idToken = await firebaseAuth.currentUser?.getIdToken(true);
          if (idToken) {
            // セッションクッキーを作成
            const sessionCreated = await createSessionCookie(idToken);
            if (!sessionCreated) {
              console.warn(
                "セッションクッキーの作成に失敗しました。一部機能が制限される可能性があります。",
              );
            }
          }

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
          const signInErrorMessage =
            signInError instanceof Error
              ? signInError.message
              : "Firebaseサインインに失敗しました";
          setError(signInErrorMessage);
          setMessage("認証に失敗しました。");
          setIsProcessing(false);

          // コードをクリーンアップ
          removeCodeFromUrl();
          removeCodeFromSession();
        }
      } catch (callbackError) {
        // サーバーエラーの処理
        console.error(
          "認証コールバック処理中にエラーが発生しました:",
          callbackError,
        );
        setError(
          callbackError instanceof Error
            ? callbackError.message
            : "サーバーとの通信中にエラーが発生しました",
        );
        setMessage("認証に失敗しました。");
        setIsProcessing(false);

        // コードをクリーンアップ
        removeCodeFromUrl();
        removeCodeFromSession();
      }
    } catch (error) {
      // 全体的なエラー処理
      console.error("認証処理中に予期しないエラーが発生しました:", error);
      setError(
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
      );
      setMessage("認証に失敗しました。");
      setIsProcessing(false);

      // コードをクリーンアップ
      removeCodeFromUrl();
      removeCodeFromSession();
    }
  }

  // isOpenの変化を監視してモーダルの表示/非表示を制御
  useEffect(() => {
    if (!modalRef.current) return;

    if (isOpen) {
      modalRef.current.showModal();
    } else {
      modalRef.current.close();
    }
  }, [isOpen]);

  return (
    <dialog ref={modalRef} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-xl text-center">認証処理</h3>

        {/* メッセージ表示 */}
        <div className="text-center my-4">
          {isProcessing && (
            <div className="flex justify-center mb-4">
              <span className="loading loading-spinner loading-md" />
            </div>
          )}
          <p>{message}</p>
          {error && <p className="text-error mt-2">{error}</p>}
        </div>

        {/* アクションボタン */}
        <div className="modal-action">
          <form method="dialog">
            <button
              type="button"
              className="btn"
              disabled={isProcessing}
              onClick={() => setIsOpen(false)}
            >
              閉じる
            </button>
          </form>
        </div>
      </div>

      {/* バックドロップクリックでモーダルを閉じる（処理中は無効） */}
      {!isProcessing && (
        <form method="dialog" className="modal-backdrop">
          <button type="button" onClick={() => setIsOpen(false)}>
            閉じる
          </button>
        </form>
      )}
    </dialog>
  );
}
