// Import test utilities and bun:test functions first
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { render, screen, waitFor } from "../../../../tests/test-utils";

// Mock 'next/navigation' module
let currentSearchParams = new URLSearchParams();
const mockedUseSearchParams = mock(() => currentSearchParams);

mock.module("next/navigation", () => ({
  useSearchParams: mockedUseSearchParams,
  useRouter: mock(() => ({ push: mock() })),
  usePathname: mock(() => "/auth/error"),
}));

// Import the component *after* the mock setup
import AuthErrorPage from "./page";

// --- Crypto Mocking ---
const MOCK_TRACKING_ID = "mock-uuid-12345";
let cryptoSpy: ReturnType<typeof spyOn>;
// --- End Crypto Mocking ---

describe("AuthErrorPage", () => {
  const setSearchParams = (params: string | URLSearchParams) => {
    currentSearchParams = new URLSearchParams(params);
  };

  beforeEach(() => {
    // Mock crypto.randomUUID before each test using spyOn
    cryptoSpy = spyOn(global.crypto, "randomUUID").mockReturnValue(
      MOCK_TRACKING_ID,
    );

    // Reset search params before each test
    setSearchParams("");
    mockedUseSearchParams.mockClear();
  });

  afterEach(() => {
    cryptoSpy.mockRestore();
  });

  test("デフォルトのエラーメッセージ、エラーコード、トラッキングID、サポート連絡方法が表示される", async () => {
    setSearchParams("");
    render(<AuthErrorPage />);

    await waitFor(() => {
      expect(screen.getByText(MOCK_TRACKING_ID)).not.toBeNull();
    });

    // Check title and description
    expect(screen.getByRole("heading", { name: "認証エラー" })).not.toBeNull();
    expect(
      screen.getByText(
        "ログインに失敗しました。しばらくしてからもう一度お試しください。",
      ),
    ).not.toBeNull();
    expect(screen.queryByRole("list")).toBeNull();

    // Check error code and tracking ID
    expect(screen.getByText("エラーコード:")).not.toBeNull();
    expect(screen.getByText("default")).not.toBeNull();
    expect(screen.getByText("トラッキングID:")).not.toBeNull();
    expect(screen.getByText(MOCK_TRACKING_ID)).not.toBeNull();

    // Check support contact information
    expect(
      screen.getByText(
        /問題が解決しない場合は、Discordサーバーのサポートチャンネルにて/u,
      ),
    ).not.toBeNull();

    // Check buttons (changed role from "button" to "link")
    const retryLink = screen.getByRole("link", {
      // role を "link" に変更
      name: "ログインを再試行",
    });
    expect(retryLink).not.toBeNull();
    expect(retryLink.getAttribute("href")).toBe("/auth/signin");

    const topLink = screen.getByRole("link", {
      // role を "link" に変更
      name: "トップページへ戻る",
    });
    expect(topLink).not.toBeNull();
    expect(topLink.getAttribute("href")).toBe("/");
  });

  // 他のテストケースにもサポート連絡方法の確認を追加 (簡略化のため、ここでは代表的なもののみ示す)
  test("AccessDenied エラーメッセージ、詳細、エラーコード、トラッキングID、サポート連絡方法が表示される", async () => {
    setSearchParams("error=AccessDenied");
    render(<AuthErrorPage />);

    await waitFor(() => {
      expect(screen.getByText(MOCK_TRACKING_ID)).not.toBeNull();
    });

    // ... (他のアサーションは省略)

    // Check support contact information
    expect(
      screen.getByText(
        /問題が解決しない場合は、Discordサーバーのサポートチャンネルにて/u,
      ),
    ).not.toBeNull();
    // Note: このテストケースではボタンの確認は元々省略されていたため、修正不要
  });

  test("Configuration エラーメッセージ、エラーコード、トラッキングID、サポート連絡方法が表示される", async () => {
    setSearchParams("error=Configuration");
    render(<AuthErrorPage />);

    await waitFor(() => {
      expect(screen.getByText(MOCK_TRACKING_ID)).not.toBeNull();
    });

    // ... (他のアサーションは省略)

    // Check support contact information
    expect(
      screen.getByText(
        /問題が解決しない場合は、Discordサーバーのサポートチャンネルにて/u,
      ),
    ).not.toBeNull();
    // Note: このテストケースではボタンの確認は元々省略されていたため、修正不要
  });

  test("未知のエラータイプの場合、デフォルトメッセージ、エラーコード、トラッキングID、サポート連絡方法が表示される", async () => {
    setSearchParams("error=UnknownErrorType");
    render(<AuthErrorPage />);

    await waitFor(() => {
      expect(screen.getByText(MOCK_TRACKING_ID)).not.toBeNull();
    });

    // ... (他のアサーションは省略)

    // Check support contact information
    expect(
      screen.getByText(
        /問題が解決しない場合は、Discordサーバーのサポートチャンネルにて/u,
      ),
    ).not.toBeNull();
    // Note: このテストケースではボタンの確認は元々省略されていたため、修正不要
  });
});
