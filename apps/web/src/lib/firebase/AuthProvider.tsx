"use client"; // クライアントコンポーネント

import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth"; // User を type としてインポート
import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react"; // ReactNode を type としてインポート
import { auth } from "./client"; // Firebase Client SDK の auth インスタンスをインポート

// Context の型定義
interface AuthContextType {
  user: User | null; // Firebase User オブジェクトまたは null
  loading: boolean; // 認証状態の読み込み中フラグ
}

// Context を作成
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider コンポーネント
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // 初期状態は読み込み中

  useEffect(() => {
    // authがnullの場合は早期リターン（サーバーサイドレンダリングなどの場合）
    if (!auth) {
      setLoading(false);
      return;
    }

    // onAuthStateChanged で認証状態の変化を監視
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser); // ユーザー情報を更新
        setLoading(false); // 読み込み完了
      },
      (error) => {
        // エラーハンドリング - ログ出力なし
        setLoading(false);
      },
    );

    // コンポーネントのアンマウント時に監視を解除
    return () => unsubscribe();
  }, []); // 初回レンダリング時のみ実行

  // Context Provider でラップして値を渡す
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Context を簡単に利用するためのカスタムフック
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
