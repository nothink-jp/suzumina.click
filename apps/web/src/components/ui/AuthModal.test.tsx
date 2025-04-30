import { render, screen, waitFor } from "@testing-library/react";
// vi.mockの呼び出しは自動的にファイルの先頭に巻き上げられるため、テスト内で使用する全てのモジュールを先にモックしておく
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// next/navigation モジュールをモック
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}));

// Discord認証アクションをモック
vi.mock("@/app/api/auth/discord/actions", () => ({
  handleDiscordCallback: vi.fn(),
}));

// セッションクッキー作成関数をモック
vi.mock("@/app/api/auth/createSessionCookie", () => ({
  createSessionCookie: vi.fn(),
}));

// Firebase クライアントをモック
vi.mock("@/lib/firebase/client", () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn(() => Promise.resolve("mock-id-token")),
    },
  },
  getAuthInstance: vi.fn(() => ({
    currentUser: {
      getIdToken: vi.fn(() => Promise.resolve("mock-id-token")),
    },
  })),
}));

// Firebase 認証関数をモック
vi.mock("firebase/auth", () => ({
  signInWithCustomToken: vi.fn(),
}));

import { createSessionCookie } from "@/app/api/auth/createSessionCookie";
import { handleDiscordCallback } from "@/app/api/auth/discord/actions";
import { auth, getAuthInstance } from "@/lib/firebase/client";
import { signInWithCustomToken } from "firebase/auth";
// テスト用にモック化したモジュールをインポート
import { useRouter, useSearchParams } from "next/navigation";

import AuthModal from "./AuthModal";

// sessionStorageのモック
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
});

// URLSearchParamsのモック
class MockURLSearchParams {
  private params: Record<string, string> = {};

  constructor(init?: string | Record<string, string>) {
    if (typeof init === "string") {
      // 簡易的な実装
      const pairs = init.replace("?", "").split("&");
      for (const pair of pairs) {
        const [key, value] = pair.split("=");
        if (key) this.params[key] = value || "";
      }
    } else if (init) {
      this.params = { ...init };
    }
  }

  get(key: string): string | null {
    return this.params[key] || null;
  }
}

// window.locationのモック
const originalLocation = window.location;
const mockLocation = {
  ...originalLocation,
  search: "",
  pathname: "/test",
  replace: vi.fn(),
  assign: vi.fn(),
  reload: vi.fn(),
};

Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

// windowのhistoryをモック
Object.defineProperty(window, "history", {
  value: {
    replaceState: vi.fn(),
  },
  writable: true,
});

describe("AuthModal コンポーネントのテスト", () => {
  beforeEach(() => {
    // 各テスト前にモックをクリア
    vi.clearAllMocks();

    // デフォルトのURLパラメータ（コードなし）
    window.location.search = "";

    // useSearchParamsのモックをリセット
    (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: (param: string) => null,
    });

    // URLSearchParamsのモックリセット
    Object.defineProperty(window, "URLSearchParams", {
      value: MockURLSearchParams,
      writable: true,
    });

    // デフォルトのモック動作を設定
    (createSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    // signInWithCustomTokenの基本実装
    (signInWithCustomToken as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        return Promise.resolve();
      },
    );
  });

  afterEach(() => {
    // テスト後にモックをリセット
    vi.resetAllMocks();
  });

  it("認証コードがない場合は何も表示しない", () => {
    // 認証コードなし
    (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: () => null,
    });

    mockSessionStorage.getItem.mockReturnValue(null);

    const { container } = render(<AuthModal />);

    // モーダルが表示されないこと
    expect(container.firstChild).toBeNull();
  });

  it("URLから認証コードを取得して処理を開始する", async () => {
    // 認証コードあり
    (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: (param: string) =>
        param === "discord_code" ? "test-auth-code" : null,
    });

    // Discord認証が成功する場合
    (handleDiscordCallback as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      customToken: "mock-custom-token",
    });

    render(<AuthModal />);

    // モーダルが表示されることを確認
    expect(screen.getByText("認証サーバーと通信中...")).toBeInTheDocument();

    // Discord認証が呼び出されることを確認
    await waitFor(() => {
      expect(handleDiscordCallback).toHaveBeenCalledWith("test-auth-code");
    });

    // Firebase認証が呼び出されることを確認
    await waitFor(() => {
      expect(signInWithCustomToken).toHaveBeenCalledWith(
        expect.anything(),
        "mock-custom-token",
      );
    });

    // 成功メッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/認証に成功しました/)).toBeInTheDocument();
    });
  });

  it("セッションストレージから認証コードを取得して処理を開始する", async () => {
    // URLパラメータにコードがない
    (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: () => null,
    });

    // locationからも取得できない
    window.location.search = "";

    // セッションストレージにコードがある
    mockSessionStorage.getItem.mockImplementation((key) => {
      if (key === "discord_auth_code") return "session-auth-code";
      return null;
    });

    // Discord認証が成功する場合
    (handleDiscordCallback as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      customToken: "mock-custom-token",
    });

    render(<AuthModal />);

    // Discord認証が呼ばれることを確認
    await waitFor(() => {
      expect(handleDiscordCallback).toHaveBeenCalledWith("session-auth-code");
    });

    // Firebase認証が呼ばれることを確認
    await waitFor(() => {
      expect(signInWithCustomToken).toHaveBeenCalledWith(
        expect.anything(),
        "mock-custom-token",
      );
    });

    // 成功メッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/認証に成功しました/)).toBeInTheDocument();
    });
  });

  it("Discord認証に失敗した場合はエラーメッセージを表示する", async () => {
    // 認証コードあり
    (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: (param: string) =>
        param === "discord_code" ? "invalid-code" : null,
    });

    // Discord認証が失敗する場合
    (handleDiscordCallback as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "認証に失敗しました",
    });

    render(<AuthModal />);

    // エラーメッセージが表示されることを確認（クラス名で特定）
    await waitFor(() => {
      expect(screen.getByText("認証に失敗しました。")).toBeInTheDocument();
      expect(screen.getByText("認証に失敗しました")).toHaveClass("text-error");
    });
  });

  it("Firebase認証に失敗した場合はエラーメッセージを表示する", async () => {
    // 認証コードあり
    (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: (param: string) =>
        param === "discord_code" ? "test-auth-code" : null,
    });

    // Discord認証は成功
    (handleDiscordCallback as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      customToken: "mock-custom-token",
    });

    // Firebase認証が失敗する場合
    (signInWithCustomToken as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Firebase認証に失敗しました"),
    );

    render(<AuthModal />);

    // エラーメッセージが表示されることを確認（クラス名で特定）
    await waitFor(() => {
      expect(screen.getByText("認証に失敗しました。")).toBeInTheDocument();
      expect(screen.getByText("Firebase認証に失敗しました")).toHaveClass(
        "text-error",
      );
    });
  });

  it("セッションクッキーの作成に失敗してもログインは成功する", async () => {
    // コンソール警告のスパイを事前に設定
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // 認証コードあり
    (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: (param: string) =>
        param === "discord_code" ? "test-auth-code" : null,
    });

    // Discord認証は成功
    (handleDiscordCallback as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      customToken: "mock-custom-token",
    });

    // セッションクッキー作成が失敗する場合
    (createSessionCookie as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    render(<AuthModal />);

    // Firebase認証が呼ばれることを確認
    await waitFor(() => {
      expect(signInWithCustomToken).toHaveBeenCalledWith(
        expect.anything(),
        "mock-custom-token",
      );
    });

    // 警告ログが出力されることを確認
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("セッションクッキーの作成に失敗"),
      );
    });

    // それでも成功メッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(/認証に成功しました/)).toBeInTheDocument();
    });
  });
});
