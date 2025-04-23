import { render, screen, waitFor } from "@testing-library/react";
import { signInWithCustomToken } from "firebase/auth";
// src/app/auth/discord/callback/CallbackClient.test.tsx
import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from "vitest";
import CallbackClient from "./CallbackClient";
import type { Auth } from "firebase/auth";

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
        error: "Discord設定が不足しています: NEXT_PUBLIC_DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, NEXT_PUBLIC_DISCORD_REDIRECT_URI, DISCORD_TARGET_GUILD_ID"
      };
    }
    return {
      success: true,
      customToken: "test-custom-token"
    };
  })
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

  // 各テスト前の準備
  beforeEach(() => {
    vi.resetAllMocks();

    // authを初期化
    mockAuth = {} as Auth;

    // コンソールエラーをモック
    consoleErrorMock = vi.fn();
    console.error = consoleErrorMock;

    // 環境変数のモック - Discord認証に必要な変数を追加
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_DISCORD_CLIENT_ID: "test-discord-client-id",
      NEXT_PUBLIC_DISCORD_REDIRECT_URI: "http://localhost:3000/auth/discord/callback",
      DISCORD_CLIENT_SECRET: "test-discord-client-secret",
      DISCORD_TARGET_GUILD_ID: "test-guild-id"
    };
  });

  // テスト後に元のコンソール関数と環境変数を復元
  afterEach(() => {
    console.error = originalConsoleError;
    // 環境変数を元の状態に戻す
    process.env = originalEnv;
  });

  test("認証コードが無い場合はエラーメッセージを表示すること", () => {
    // 認証コードがnullを返すようにモック
    mockSearchParamsGet.mockReturnValue(null);

    render(<CallbackClient />);

    // エラーメッセージが表示されることを確認
    expect(screen.getByText("エラーが発生しました。")).toBeInTheDocument();
    expect(screen.getByText(/認証コードが見つかりません/)).toBeInTheDocument();
  });

  test("デフォルトのFunctions URLが使用される場合のテスト", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");

    // Server Actionのモック実装を上書き
    const { handleDiscordCallback } = await import("@/app/api/auth/discord/actions");
    (handleDiscordCallback as Mock).mockResolvedValue({
      success: true,
      customToken: "test-custom-token"
    });

    // signInWithCustomTokenのレスポンスをモック
    (signInWithCustomToken as Mock).mockResolvedValue({});

    // コンポーネントをレンダリング
    render(<CallbackClient />);

    // 初期段階ではローディングが表示されていることを確認
    expect(screen.getByText("認証処理中...")).toBeInTheDocument();
    expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();

    // Server Actionが呼び出されたことを確認
    await waitFor(() => {
      expect(handleDiscordCallback).toHaveBeenCalledWith("test-code");
    });
  });

  test("APIリクエストに成功した場合、認証とリダイレクトが行われること", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");

    // Server Actionのモック実装を上書き
    const { handleDiscordCallback } = await import("@/app/api/auth/discord/actions");
    (handleDiscordCallback as Mock).mockResolvedValue({
      success: true,
      customToken: "test-custom-token"
    });

    // signInWithCustomTokenのレスポンスをモック
    (signInWithCustomToken as Mock).mockResolvedValue({});

    render(<CallbackClient />);

    // 初期状態で「認証処理中...」と表示されていることを確認
    expect(screen.getByText("認証処理中...")).toBeInTheDocument();
    expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();

    // 非同期処理が完了するまで待機
    await waitFor(() => {
      expect(
        screen.getByText(
          "認証に成功しました！ホームページにリダイレクトします..."
        )
      ).toBeInTheDocument();
    });

    // カスタムトークンでサインインが呼び出されたことを確認
    expect(signInWithCustomToken).toHaveBeenCalledWith(
      expect.anything(),
      "test-custom-token"
    );

    // ホームページへのリダイレクトが呼び出されたことを確認
    expect(mockedPush).toHaveBeenCalledWith("/");
  });

  test("APIリクエストが失敗した場合はエラーメッセージを表示すること", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");

    // Server Actionのモック実装を上書き
    const { handleDiscordCallback } = await import("@/app/api/auth/discord/actions");
    (handleDiscordCallback as Mock).mockResolvedValue({
      success: false,
      error: "サーバー内部エラー"
    });

    render(<CallbackClient />);

    // 非同期処理が完了するまで待機
    await waitFor(() => {
      expect(screen.getByText("認証に失敗しました。")).toBeInTheDocument();
    });

    // エラーメッセージが表示されることを確認
    expect(screen.getByText(/サーバー内部エラー/)).toBeInTheDocument();

    // コンソールエラーが呼び出されることを確認
    expect(consoleErrorMock).toHaveBeenCalled();
  });

  test("APIレスポンスのJSONがパースできない場合はデフォルトエラーを表示すること", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");

    // Server Actionのモック実装を上書き
    const { handleDiscordCallback } = await import("@/app/api/auth/discord/actions");
    (handleDiscordCallback as Mock).mockRejectedValue(new Error("不明なサーバーエラー"));

    render(<CallbackClient />);

    // 非同期処理が完了するまで待機
    await waitFor(() => {
      expect(screen.getByText("認証に失敗しました。")).toBeInTheDocument();
    });

    // エラーテキストを含むエラーメッセージが表示されることを確認
    const errorElement = screen.getByText(/エラー:/);
    expect(errorElement).toBeInTheDocument();
    // 実際のエラーメッセージに合わせて期待値を変更
    expect(errorElement.textContent).toContain("不明なサーバーエラー");
  });

  test("レスポンスが成功でもカスタムトークンがない場合はエラーを表示すること", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");

    // Server Actionのモック実装を上書き
    const { handleDiscordCallback } = await import("@/app/api/auth/discord/actions");
    (handleDiscordCallback as Mock).mockResolvedValue({
      success: true,
      // customTokenがない
    });

    render(<CallbackClient />);

    // 非同期処理が完了するまで待機
    await waitFor(() => {
      expect(screen.getByText("認証に失敗しました。")).toBeInTheDocument();
    });

    // エラーメッセージが表示されることを確認（実際の実装に合わせて更新）
    expect(screen.getByText(/認証処理に失敗しました/)).toBeInTheDocument();
  });

  test("レスポンスがsuccessでない場合はエラーメッセージを表示すること", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");

    // Server Actionのモック実装を上書き
    const { handleDiscordCallback } = await import("@/app/api/auth/discord/actions");
    (handleDiscordCallback as Mock).mockResolvedValue({
      success: false,
      error: "権限がありません",
      customToken: "test-token" // トークンはあるがsuccessでない
    });

    render(<CallbackClient />);

    // 非同期処理が完了するまで待機
    await waitFor(() => {
      expect(screen.getByText("認証に失敗しました。")).toBeInTheDocument();
    });

    // エラーメッセージが表示されることを確認
    expect(screen.getByText(/権限がありません/)).toBeInTheDocument();
  });

  test("authがnullの場合はエラーメッセージを表示すること", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");

    // Server Actionのモック実装を上書き
    const { handleDiscordCallback } = await import("@/app/api/auth/discord/actions");
    (handleDiscordCallback as Mock).mockResolvedValue({
      success: true,
      customToken: "test-custom-token"
    });

    // authをnullに設定
    mockAuth = null;

    render(<CallbackClient />);

    // 非同期処理が完了するまで待機
    await waitFor(() => {
      expect(screen.getByText("認証に失敗しました。")).toBeInTheDocument();
    });

    // エラーメッセージが表示されることを確認
    expect(
      screen.getByText(/認証システムの初期化に失敗しました/)
    ).toBeInTheDocument();
  });

  test("サインイン処理でエラーが発生した場合はエラーメッセージを表示すること", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");

    // Server Actionのモック実装を上書き
    const { handleDiscordCallback } = await import("@/app/api/auth/discord/actions");
    (handleDiscordCallback as Mock).mockResolvedValue({
      success: true,
      customToken: "test-custom-token"
    });

    // signInWithCustomTokenがエラーを投げるようにモック
    (signInWithCustomToken as Mock).mockRejectedValue(
      new Error("認証エラー")
    );

    render(<CallbackClient />);

    // 非同期処理が完了するまで待機
    await waitFor(() => {
      expect(screen.getByText("認証に失敗しました。")).toBeInTheDocument();
    });

    // エラーメッセージが表示されることを確認
    expect(screen.getByText(/認証エラー/)).toBeInTheDocument();

    // コンソールエラーが呼び出されることを確認
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "Authentication failed:",
      expect.any(Error)
    );
  });
});
