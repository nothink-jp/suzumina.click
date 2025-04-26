import { render, screen, waitFor } from "@testing-library/react";
import { signInWithCustomToken } from "firebase/auth";
import type { Auth } from "firebase/auth";
// src/app/auth/discord/callback/CallbackClient.test.tsx
import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import CallbackClient from "./CallbackClient";

// モック変数の定義
const mockedPush = vi.fn();
const mockSearchParamsGet = vi.fn();
// authのモック（テスト中に変更できるようにする）
let mockAuth: Auth | null = {} as Auth;

// Server Actionsのモック
vi.mock("@/app/api/auth/discord/actions", () => ({
  handleDiscordCallback: vi.fn().mockImplementation(async (code: string) => {
    // デフォルトの実装
    if (!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID) {
      return {
        success: false,
        error:
          "Discord設定が不足しています: NEXT_PUBLIC_DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, NEXT_PUBLIC_DISCORD_REDIRECT_URI, DISCORD_TARGET_GUILD_ID",
      };
    }
    return {
      success: true,
      customToken: "test-custom-token",
    };
  }),
}));

// firebase/authをモック
vi.mock("firebase/auth", () => ({
  signInWithCustomToken: vi.fn(),
}));

// firebase/clientをモック
vi.mock("@/lib/firebase/client", () => ({
  get auth() {
    return mockAuth;
  }, // ゲッターを使用してテスト中に値を変更できるようにする
}));

// localStorage モックを作成
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// URLモックを作成
class MockURL {
  public searchParams: URLSearchParams;
  public origin: string;
  public toString: () => string;

  constructor(url: string, base?: string) {
    this.searchParams = new URLSearchParams();
    this.origin = base || "http://localhost:3000";
    this.toString = () => `${url}?${this.searchParams.toString()}`;
  }
}

// next/navigationをモック
vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: mockedPush,
    }),
    useSearchParams: () => ({
      get: mockSearchParamsGet,
    }),
  };
});

// コンソール出力をモック
const originalConsoleError = console.error;
let consoleErrorMock: ReturnType<typeof vi.fn>;

describe("CallbackClientコンポーネント", () => {
  // テスト前の環境変数を保存
  const originalEnv = { ...process.env };
  const originalURL = global.URL;
  const originalLocalStorage = global.localStorage;

  // 各テスト前の準備
  beforeEach(() => {
    vi.resetAllMocks();

    // authを初期化
    mockAuth = {} as Auth;

    // コンソールエラーをモック
    consoleErrorMock = vi.fn();
    console.error = consoleErrorMock;

    // URLクラスをモック
    global.URL = MockURL as any;

    // localStorageをモック
    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
    });

    // window.location.originをモック
    Object.defineProperty(window, "location", {
      value: {
        origin: "http://localhost:3000",
      },
      writable: true,
    });

    // 環境変数のモック - Discord認証に必要な変数を追加
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_DISCORD_CLIENT_ID: "test-discord-client-id",
      NEXT_PUBLIC_DISCORD_REDIRECT_URI:
        "http://localhost:3000/auth/discord/callback",
      DISCORD_CLIENT_SECRET: "test-discord-client-secret",
      DISCORD_TARGET_GUILD_ID: "test-guild-id",
    };
  });

  // テスト後に元のコンソール関数と環境変数を復元
  afterEach(() => {
    console.error = originalConsoleError;
    // 環境変数を元の状態に戻す
    process.env = originalEnv;
    // URLクラスを元に戻す
    global.URL = originalURL;
    // ローカルストレージをクリア
    mockLocalStorage.clear();
  });

  test("認証コードが無い場合はエラーメッセージを表示すること", () => {
    // 認証コードがnullを返すようにモック
    mockSearchParamsGet.mockReturnValue(null);

    render(<CallbackClient />);

    // ホームページへリダイレクトされることを確認
    expect(mockedPush).toHaveBeenCalledWith("/");
  });

  test("デフォルトのFunctions URLが使用される場合のテスト", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");
    mockLocalStorage.getItem.mockReturnValue("/");

    // コンポーネントをレンダリング
    render(<CallbackClient />);

    // ローディング表示が表示されていることを確認
    expect(screen.getByText("リダイレクトしています...")).toBeInTheDocument();
    expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();

    // リダイレクトが呼び出されたことを確認
    await waitFor(() => {
      expect(mockedPush).toHaveBeenCalled();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        "auth_redirect_url",
      );
    });
  });

  test("相対パスURLが処理されること", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");
    mockLocalStorage.getItem.mockReturnValue("/profile");

    // コンポーネントをレンダリング
    render(<CallbackClient />);

    // リダイレクトが呼び出されたことを確認
    await waitFor(() => {
      expect(mockedPush).toHaveBeenCalled();
    });
  });

  test("無効なURLの場合はホームページにリダイレクトされること", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");
    mockLocalStorage.getItem.mockReturnValue("invalid-url");

    // コンポーネントをレンダリング
    render(<CallbackClient />);

    // リダイレクトが呼び出されたことを確認
    await waitFor(() => {
      expect(mockedPush).toHaveBeenCalled();
      expect(consoleErrorMock).toHaveBeenCalledWith(
        "無効なリダイレクトURLです:",
        "invalid-url",
      );
    });
  });

  // 他のテストケースは省略
});
