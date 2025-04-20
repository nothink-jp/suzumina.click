import { render, screen, waitFor } from "@testing-library/react";
import { signInWithCustomToken } from "firebase/auth";
// src/app/auth/discord/callback/CallbackClient.test.tsx
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import CallbackClient from "./CallbackClient";

// モック変数の定義
const mockedPush = vi.fn();
const mockSearchParamsGet = vi.fn();
// authのモック（テスト中に変更できるようにする）
let mockAuth: any = {};

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

// グローバルfetchをモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// コンソール出力をモック
const originalConsoleError = console.error;
let consoleErrorMock: ReturnType<typeof vi.fn>;

describe("CallbackClientコンポーネント", () => {
  // 各テスト前の準備
  beforeEach(() => {
    vi.resetAllMocks();

    // fetchのデフォルト実装を提供
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    // authを初期化
    mockAuth = {};

    // コンソールエラーをモック
    consoleErrorMock = vi.fn();
    console.error = consoleErrorMock;

    // 環境変数のモック
    process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_AUTH_CALLBACK_URL =
      "https://test-functions-url.com";
  });

  // テスト後に元のコンソール関数を復元
  afterEach(() => {
    console.error = originalConsoleError;
    // 環境変数をクリア
    process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_AUTH_CALLBACK_URL = undefined;
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
    // 環境変数を明示的に削除（デフォルト値が使用される）
    // undefineだけでなく、deleteを使って確実に環境変数を削除する
    delete process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_AUTH_CALLBACK_URL;

    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");

    // fetchの挙動をモック
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          customToken: "test-custom-token",
        }),
    });

    // コンポーネントをレンダリング
    render(<CallbackClient />);

    // 初期段階ではローディングが表示されていることを確認
    expect(screen.getByText("認証処理中...")).toBeInTheDocument();
    expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();

    // fetchがデフォルトURLで呼び出されることを確認
    await waitFor(() => {
      // 呼び出し引数を完全に検証
      const expectedUrl =
        "http://127.0.0.1:5001/suzumina-click-firebase/asia-northeast1/discordAuthCallback";
      const expectedOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: "test-code" }),
      };

      // mockFetchが正しい引数で呼ばれたか確認
      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining(expectedOptions),
      );
    });
  });

  test("APIリクエストに成功した場合、認証とリダイレクトが行われること", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");

    // fetchのレスポンスをモック
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          customToken: "test-custom-token",
        }),
    });

    // signInWithCustomTokenのレスポンスをモック
    (signInWithCustomToken as vi.Mock).mockResolvedValue({});

    render(<CallbackClient />);

    // 初期状態で「認証処理中...」と表示されていることを確認
    expect(screen.getByText("認証処理中...")).toBeInTheDocument();
    expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();

    // 非同期処理が完了するまで待機
    await waitFor(() => {
      expect(
        screen.getByText(
          "認証に成功しました！ホームページにリダイレクトします...",
        ),
      ).toBeInTheDocument();
    });

    // 正しいパラメータでfetchが呼び出されたことを確認
    expect(mockFetch).toHaveBeenCalledWith(
      "https://test-functions-url.com",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ code: "test-code" }),
      }),
    );

    // カスタムトークンでサインインが呼び出されたことを確認
    expect(signInWithCustomToken).toHaveBeenCalledWith(
      expect.anything(),
      "test-custom-token",
    );

    // ホームページへのリダイレクトが呼び出されたことを確認
    expect(mockedPush).toHaveBeenCalledWith("/");
  });

  test("APIリクエストが失敗した場合はエラーメッセージを表示すること", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");

    // fetchのレスポンスが失敗するようにモック
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          error: "サーバー内部エラー",
        }),
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

    // fetchのレスポンスが失敗するようにモック
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("JSON parse error")),
    });

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

    // fetchのレスポンスはok=trueだがトークンがないようにモック
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          // customTokenがない
        }),
    });

    render(<CallbackClient />);

    // 非同期処理が完了するまで待機
    await waitFor(() => {
      expect(screen.getByText("認証に失敗しました。")).toBeInTheDocument();
    });

    // エラーメッセージが表示されることを確認
    expect(
      screen.getByText(/カスタムトークンの取得に失敗しました/),
    ).toBeInTheDocument();
  });

  test("レスポンスがsuccessでない場合はエラーメッセージを表示すること", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");

    // fetchのレスポンスがsuccessでないようにモック
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: false,
          error: "権限がありません",
          customToken: "test-token", // トークンはあるがsuccessでない
        }),
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

    // fetchのレスポンスをモック
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          customToken: "test-custom-token",
        }),
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
      screen.getByText(/認証システムの初期化に失敗しました/),
    ).toBeInTheDocument();
  });

  test("サインイン処理でエラーが発生した場合はエラーメッセージを表示すること", async () => {
    // 認証コードが存在するようにモック
    mockSearchParamsGet.mockReturnValue("test-code");

    // fetchのレスポンスをモック
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          customToken: "test-custom-token",
        }),
    });

    // signInWithCustomTokenがエラーを投げるようにモック
    (signInWithCustomToken as vi.Mock).mockRejectedValue(
      new Error("認証エラー"),
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
      expect.any(Error),
    );
  });
});
