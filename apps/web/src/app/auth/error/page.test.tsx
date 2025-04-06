// Import test utilities and bun:test functions first
import { beforeEach, describe, expect, mock, test } from "bun:test";
import { render, screen } from "../../../../tests/test-utils";

// Mock 'next/navigation' module
// Define the mock function instance within the factory scope
let currentSearchParams = new URLSearchParams();
const mockedUseSearchParams = mock(() => currentSearchParams);

mock.module("next/navigation", () => ({
  useSearchParams: mockedUseSearchParams,
  // Mock other exports if necessary, e.g., useRouter, usePathname
  useRouter: mock(() => ({ push: mock() })),
  usePathname: mock(() => "/auth/error"), // Example path
}));

// Import the component *after* the mock setup
import AuthErrorPage from "./page";

describe("AuthErrorPage", () => {
  // Helper function to set the search params for a test
  const setSearchParams = (params: string | URLSearchParams) => {
    currentSearchParams = new URLSearchParams(params);
    // Note: We are changing the variable the mock function closes over.
    // This works because the mock function `mockedUseSearchParams` references
    // the `currentSearchParams` variable in the outer scope.
  };

  beforeEach(() => {
    // Reset search params before each test
    setSearchParams(""); // Set to empty params
    mockedUseSearchParams.mockClear(); // Clear any mock call history if needed
  });

  test("デフォルトのエラーメッセージが表示される (error パラメータなし)", () => {
    setSearchParams(""); // Explicitly set for clarity
    render(<AuthErrorPage />);

    expect(screen.getByRole("heading", { name: "認証エラー" })).not.toBeNull();
    expect(
      screen.getByText(
        "ログインに失敗しました。しばらくしてからもう一度お試しください。",
      ),
    ).not.toBeNull();
    expect(screen.queryByRole("list")).toBeNull();

    const retryLink = screen.getByRole("link", { name: "ログインを再試行" });
    expect(retryLink).not.toBeNull();
    expect(retryLink.getAttribute("href")).toBe("/auth/signin");

    const topLink = screen.getByRole("link", { name: "トップページへ戻る" });
    expect(topLink).not.toBeNull();
    expect(topLink.getAttribute("href")).toBe("/");
  });

  test("AccessDenied エラーメッセージと詳細が表示される", () => {
    setSearchParams("error=AccessDenied");
    render(<AuthErrorPage />);

    expect(
      screen.getByRole("heading", { name: "アクセスが拒否されました" }),
    ).not.toBeNull();
    expect(
      screen.getByText(
        "ログインに必要な権限がないか、アクセスが許可されませんでした。",
      ),
    ).not.toBeNull();

    const list = screen.getByRole("list");
    expect(list).not.toBeNull();
    expect(
      screen.getByText(
        "「すずみなふぁみりー」Discordサーバーのメンバーですか？",
      ),
    ).not.toBeNull();
    expect(
      screen.getByText("Discordでの認証を正しく許可しましたか？"),
    ).not.toBeNull();
    expect(screen.getByText("必要な権限を付与しましたか？")).not.toBeNull();
  });

  test("Configuration エラーメッセージが表示される", () => {
    setSearchParams("error=Configuration");
    render(<AuthErrorPage />);

    expect(screen.getByRole("heading", { name: "設定エラー" })).not.toBeNull();
    expect(
      screen.getByText(
        "サーバーの設定に問題があるため、ログインできませんでした。",
      ),
    ).not.toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });

  test("未知のエラータイプの場合、デフォルトメッセージが表示される", () => {
    setSearchParams("error=UnknownErrorType");
    render(<AuthErrorPage />);

    expect(screen.getByRole("heading", { name: "認証エラー" })).not.toBeNull();
    expect(
      screen.getByText(
        "ログインに失敗しました。しばらくしてからもう一度お試しください。",
      ),
    ).not.toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
