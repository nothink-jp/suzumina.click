"use client";

/**
 * Firebase認証機能のカスタムフック
 *
 * ユーザー認証状態を管理し、アプリケーション全体で使用するための機能を提供します
 */

import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { app } from "./client";

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
};

/**
 * 認証状態を管理するためのカスタムフック
 *
 * @returns 認証状態 (user, loading, error)
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const auth = getAuth(app || undefined);

      // 認証状態の監視
      const unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          if (firebaseUser) {
            // ユーザー情報を整形
            const authUser: AuthUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              isAnonymous: firebaseUser.isAnonymous,
            };
            setUser(authUser);
          } else {
            setUser(null);
          }
          setLoading(false);
        },
        (error) => {
          setError(error);
          setLoading(false);
        },
      );

      // クリーンアップ関数
      return () => unsubscribe();
    } catch (error) {
      console.error("認証初期化エラー:", error);
      setLoading(false);
      setError(
        error instanceof Error ? error : new Error("認証エラーが発生しました"),
      );
    }
  }, []);

  return { user, loading, error };
}
