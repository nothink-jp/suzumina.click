// src/app/auth/discord/callback/page.test.tsx
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DiscordCallbackPage from "./page";

// CallbackClientコンポーネントをモック
vi.mock("./CallbackClient", () => ({
  default: () => (
    <div data-testid="mock-callback-client">モックコールバッククライアント</div>
  ),
}));

// Reactのコンポーネントをモック
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    Suspense: ({
      children,
      fallback,
    }: { children: React.ReactNode; fallback: React.ReactNode }) => (
      <>
        {/* モックされたSuspenseでは常にfallbackを表示する検証用と、childrenも表示する本番用の切り替えができるようにする */}
        <div data-testid="suspense-fallback">{fallback}</div>
        <div data-testid="suspense-children">{children}</div>
      </>
    ),
  };
});

describe("DiscordCallbackPageコンポーネント", () => {
  test("Suspenseでラップされたコンポーネントが正しくレンダリングされること", () => {
    // Arrange & Act
    render(<DiscordCallbackPage />);

    // Assert
    // Suspenseのfallbackが存在することを確認
    const fallback = screen.getByTestId("suspense-fallback");
    expect(fallback).toBeInTheDocument();

    // LoadingFallbackコンポーネントのコンテンツが含まれていることを確認
    expect(fallback.textContent).toContain("Discord 認証");
    expect(fallback.textContent).toContain("認証情報を処理しています");

    // ローディングインジケータが存在することを確認
    const loadingIndicator = screen.getByText("", {
      selector: "span.loading.loading-dots",
    });
    expect(loadingIndicator).toBeInTheDocument();

    // CallbackClientコンポーネントも存在することを確認（通常はSuspenseによって隠される）
    const callbackClient = screen.getByTestId("suspense-children");
    expect(callbackClient).toBeInTheDocument();
    expect(callbackClient.textContent).toContain(
      "モックコールバッククライアント",
    );
  });

  test("LoadingFallbackコンポーネントが正しく表示されること", () => {
    // Arrange & Act
    render(<DiscordCallbackPage />);

    // Assert
    // 見出しが正しく表示されていることを確認
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Discord 認証",
    );

    // テキストが正しく表示されていることを確認
    expect(screen.getByText("認証情報を処理しています...")).toBeInTheDocument();

    // ローディングインジケータのクラス名が正しいことを確認
    const loadingIndicator = screen.getByText("", { selector: "span.loading" });
    expect(loadingIndicator).toHaveClass("loading-dots");
    expect(loadingIndicator).toHaveClass("loading-lg");
  });
});
