import { render, screen } from "@testing-library/react";
import { onAuthStateChanged } from "firebase/auth";
import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Mock } from "vitest";
import { AuthProvider, useAuth } from "./AuthProvider";

// firebase/authをモック
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(),
}));

// firebase/clientをモック
vi.mock("./client", () => ({
  auth: {},
}));

// テスト用のモックユーザー
const mockUser = {
  uid: "test-uid",
  email: "test@example.com",
  displayName: "テストユーザー",
  photoURL: "https://example.com/avatar.jpg",
};

describe("AuthProviderコンポーネント", () => {
  // 各テスト前の準備
  beforeEach(() => {
    vi.resetAllMocks();

    (onAuthStateChanged as Mock).mockImplementation((auth, callback) => {
      callback(null);
      return vi.fn(); // unsubscribe関数
    });
  });

  test("子要素を正しくレンダリングすること", () => {
    render(
      <AuthProvider>
        <div data-testid="child">子要素</div>
      </AuthProvider>,
    );

    expect(screen.getByTestId("child")).toHaveTextContent("子要素");
  });

  test("onAuthStateChangedが呼び出されること", () => {
    render(
      <AuthProvider>
        <div>テスト</div>
      </AuthProvider>,
    );

    expect(onAuthStateChanged).toHaveBeenCalled();
  });

  test("認証状態が変更されたときにユーザー情報が更新されること", () => {
    // onAuthStateChangedがユーザー情報を返すようにモック
    (onAuthStateChanged as Mock).mockImplementation((auth, callback) => {
      callback(mockUser);
      return vi.fn();
    });

    // AuthProviderとuseAuthを使用するテスト用コンポーネント
    const TestComponent = () => {
      const { user, loading } = useAuth();
      return (
        <div>
          <div data-testid="loading">
            {loading ? "読み込み中" : "読み込み完了"}
          </div>
          <div data-testid="user-info">
            {user ? user.displayName : "未ログイン"}
          </div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // ユーザー情報と読み込み状態が反映されていることを確認
    expect(screen.getByTestId("loading")).toHaveTextContent("読み込み完了");
    expect(screen.getByTestId("user-info")).toHaveTextContent("テストユーザー");
  });

  test("未認証の場合はnullが設定されること", () => {
    // onAuthStateChangedがnullを返すようにモック
    (onAuthStateChanged as Mock).mockImplementation((auth, callback) => {
      callback(null);
      return vi.fn();
    });

    // AuthProviderとuseAuthを使用するテスト用コンポーネント
    const TestComponent = () => {
      const { user, loading } = useAuth();
      return (
        <div>
          <div data-testid="loading">
            {loading ? "読み込み中" : "読み込み完了"}
          </div>
          <div data-testid="user-info">
            {user ? user.displayName : "未ログイン"}
          </div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // ユーザー情報と読み込み状態が反映されていることを確認
    expect(screen.getByTestId("loading")).toHaveTextContent("読み込み完了");
    expect(screen.getByTestId("user-info")).toHaveTextContent("未ログイン");
  });

  test("authがnullの場合にロード状態が完了すること", () => {
    // authをnullに設定
    vi.doMock("./client", () => ({
      auth: null,
    }));

    // AuthProviderとuseAuthを使用するテスト用コンポーネント
    const TestComponent = () => {
      const { user, loading } = useAuth();
      return (
        <div>
          <div data-testid="loading">
            {loading ? "読み込み中" : "読み込み完了"}
          </div>
          <div data-testid="user-info">
            {user ? user.displayName : "未ログイン"}
          </div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // 読み込みが完了していることを確認
    expect(screen.getByTestId("loading")).toHaveTextContent("読み込み完了");
  });

  test("認証エラーが発生した場合に適切に処理されること", () => {
    // onAuthStateChangedがエラーを返すようにモック
    (onAuthStateChanged as Mock).mockImplementation(
      (auth, callback, errorCallback) => {
        errorCallback(new Error("認証エラー"));
        return vi.fn();
      },
    );
    // AuthProviderとuseAuthを使用するテスト用コンポーネント
    const TestComponent = () => {
      const { user, loading } = useAuth();
      return (
        <div>
          <div data-testid="loading">
            {loading ? "読み込み中" : "読み込み完了"}
          </div>
          <div data-testid="user-info">
            {user ? user.displayName : "未ログイン"}
          </div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // エラー発生時に読み込み状態が完了していることを確認
    expect(screen.getByTestId("loading")).toHaveTextContent("読み込み完了");
    // ユーザーは未ログイン状態であることを確認
    expect(screen.getByTestId("user-info")).toHaveTextContent("未ログイン");
  });
});

describe("useAuthフック", () => {
  test("AuthProvider外で使用するとエラーがスローされること", () => {
    // コンソールエラーを一時的に抑制（Reactの警告を非表示にするため）
    const originalError = console.error;
    console.error = vi.fn();

    // モック関数を作成してエラー発生を検知
    const errorFn = vi.fn();

    // 独自のコンテキストを定義してuseContextが未定義を返すようにする
    vi.spyOn(React, "useContext").mockImplementation(() => undefined);

    // テスト用コンポーネント（期待されるエラーをキャッチ）
    const TestComponent = () => {
      try {
        // ここでuseAuthを呼び出すとエラーが発生する
        useAuth();
      } catch (error) {
        // エラーメッセージを検証
        if (
          error instanceof Error &&
          error.message === "useAuth must be used within an AuthProvider"
        ) {
          errorFn(error.message);
        } else {
          // その他のエラーは再スロー
          throw error;
        }
      }
      return null;
    };

    // コンポーネントをレンダリング
    render(<TestComponent />);

    // 期待するエラーメッセージで関数が呼ばれたことを確認
    expect(errorFn).toHaveBeenCalledWith(
      "useAuth must be used within an AuthProvider",
    );

    // コンソールエラーを復元
    console.error = originalError;
    // モックをリセット
    vi.restoreAllMocks();
  });
});
