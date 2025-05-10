import React, { createContext, useContext } from "react";
import type { ReactElement, ReactNode } from "react";

/**
 * Storybookテスト用のモックFirebase User型
 */
interface MockUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  [key: string]: unknown;
}

/**
 * 認証コンテキストの型
 * 元のAuthContextと同じ型にする
 */
interface AuthContextType {
  user: MockUser | null;
  loading: boolean;
}

// コンテキスト作成
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 認証状態を取得するカスタムフック
 * 元のuseAuthフックと同じシグネチャにする
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Storybookテスト用の認証プロバイダー
 * 元のAuthProviderと同じprops型を持つ
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * デフォルトのモック状態 - ログインしていない状態
 */
const defaultMockState: AuthContextType = {
  user: null,
  loading: false,
};

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  return (
    <AuthContext.Provider value={defaultMockState}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * テスト用にモック状態を設定する関数
 * これはStorybookのControlsパネルなどで使用可能
 */
export function setMockAuthState(isLoggedIn: boolean, loading = false) {
  if (isLoggedIn) {
    defaultMockState.user = {
      uid: "mock-user-id",
      email: "user@example.com",
      displayName: "テストユーザー",
      photoURL: "https://example.com/profile.jpg",
      emailVerified: true,
    };
  } else {
    defaultMockState.user = null;
  }
  defaultMockState.loading = loading;
}
