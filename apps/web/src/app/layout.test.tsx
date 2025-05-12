import { render, screen } from "@testing-library/react";
// src/app/layout.test.tsx
import { describe, expect, test, vi } from "vitest";
import RootLayout, { metadata } from "./layout";

// 依存コンポーネントのモック
vi.mock("@/components/layout/Header", () => ({
  default: () => <header data-testid="mock-header">ヘッダーモック</header>,
}));

vi.mock("@/components/layout/Footer", () => ({
  default: () => <footer data-testid="mock-footer">フッターモック</footer>,
}));

vi.mock("@/lib/firebase/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-auth-provider">{children}</div>
  ),
}));

// AuthModalコンポーネントのモック
vi.mock("@/components/ui/AuthModal", () => ({
  default: () => <div data-testid="mock-auth-modal">認証モーダルモック</div>,
}));

// フォントのモック
vi.mock("next/font/google", () => ({
  Noto_Sans_JP: () => ({
    variable: "test-font-variable",
    style: { fontFamily: "Noto Sans JP" },
    className: "test-font-class",
  }),
  Slackside_One: () => ({
    variable: "test-slackside-variable",
    style: { fontFamily: "Slackside One" },
    className: "test-slackside-class",
  }),
}));

describe("RootLayoutコンポーネント", () => {
  test("適切な言語とテーマ属性でHTMLをレンダリングすること", () => {
    // レンダリング
    render(
      <RootLayout>
        <div data-testid="test-children">子コンテンツ</div>
      </RootLayout>,
    );

    // htmlタグが正しく設定されているか確認
    const html = document.querySelector("html");
    expect(html).toHaveAttribute("lang", "ja");
    expect(html).toHaveAttribute("data-theme", "light");
  });

  test("Noto Sans JPフォントでHTMLをレンダリングすること", () => {
    render(
      <RootLayout>
        <div data-testid="test-children">子コンテンツ</div>
      </RootLayout>,
    );

    // htmlタグにフォント変数が設定されているか確認
    const html = document.querySelector("html");
    expect(html?.className).toContain("test-font-variable");
  });

  test("bodyタグに適切なクラスが設定されていること", () => {
    render(
      <RootLayout>
        <div data-testid="test-children">子コンテンツ</div>
      </RootLayout>,
    );

    // bodyタグにクラスが正しく設定されているか確認
    const body = document.querySelector("body");
    expect(body?.className).toContain("antialiased");
    expect(body?.className).toContain("flex");
    expect(body?.className).toContain("flex-col");
    expect(body?.className).toContain("min-h-screen");
  });

  test("AuthProviderでラップされたレイアウトをレンダリングすること", () => {
    render(
      <RootLayout>
        <div data-testid="test-children">子コンテンツ</div>
      </RootLayout>,
    );

    // AuthProviderが存在することを確認
    expect(screen.getByTestId("mock-auth-provider")).toBeInTheDocument();

    // ヘッダーが存在することを確認
    expect(screen.getByTestId("mock-header")).toBeInTheDocument();

    // mainエリアに子コンテンツが表示されていることを確認
    expect(screen.getByTestId("test-children")).toBeInTheDocument();

    // フッターが存在することを確認
    expect(screen.getByTestId("mock-footer")).toBeInTheDocument();

    // 認証モーダルが存在することを確認
    expect(screen.getByTestId("mock-auth-modal")).toBeInTheDocument();
  });

  test("すべてのレイアウト要素が正しい順番でレンダリングされること", () => {
    render(
      <RootLayout>
        <div data-testid="test-children">子コンテンツ</div>
      </RootLayout>,
    );

    // DOM内の順番を確認
    const mockAuthProvider = screen.getByTestId("mock-auth-provider");
    const mockHeader = screen.getByTestId("mock-header");
    const mainContent = screen.getByRole("main");
    const testChildren = screen.getByTestId("test-children");
    const mockFooter = screen.getByTestId("mock-footer");
    const mockAuthModal = screen.getByTestId("mock-auth-modal");

    expect(mockAuthProvider.contains(mockHeader)).toBeTruthy();
    expect(mockAuthProvider.contains(mainContent)).toBeTruthy();
    expect(mockAuthProvider.contains(mockFooter)).toBeTruthy();
    expect(mockAuthProvider.contains(mockAuthModal)).toBeTruthy();
    expect(mainContent.contains(testChildren)).toBeTruthy();
  });
});

describe("メタデータ", () => {
  test("適切なタイトルと説明が設定されていること", () => {
    expect(metadata.title).toBe("すずみなくりっく！");
    expect(metadata.description).toBe("涼花みなせ様の非公式ファンサイト");
  });
});
