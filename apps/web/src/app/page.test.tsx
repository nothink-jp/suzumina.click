import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page"; // page.tsx をインポート

// 非同期サーバーコンポーネントのテストのため、必要なモックを設定

// HeadlessUiDisclosureExample コンポーネントをモック
vi.mock("./_components/HeadlessUiDisclosureExample", () => ({
  default: () => (
    <div data-testid="mock-disclosure">
      <button type="button">Headless UI Disclosure サンプル</button>
    </div>
  ),
}));

// AuthButton コンポーネントをモック
vi.mock("@/components/ui/AuthButton", () => ({
  default: () => <button data-testid="mock-auth-button">ログイン</button>,
}));

// getCurrentUser 関数をモック
vi.mock("./api/auth/getCurrentUser", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null) // デフォルトでは非ログイン状態
}));

describe("Home Page", () => {
  it("should render the main heading", async () => {
    // Arrange & Act
    const { container } = render(await HomePage());

    // Assert - h1タグを直接検索
    const heading = container.querySelector("h1");
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent).toBe("すずみなくりっく！");
  });

  it("should render the Headless UI disclosure example button", async () => {
    // Arrange & Act
    render(await HomePage());

    // Assert - モック化されたボタンを検索
    const disclosureButton = screen.getByText(/Headless UI Disclosure サンプル/i);
    expect(disclosureButton).toBeInTheDocument();
  });
  
  it("非ログイン時にはAuthButtonが表示されること", async () => {
    // Arrange & Act
    render(await HomePage());
    
    // Assert
    const authButton = screen.getByTestId("mock-auth-button");
    expect(authButton).toBeInTheDocument();
  });
  
  it("ログイン時にはユーザー情報が表示されること", async () => {
    // Arrange - ログイン状態のモックを設定
    const { getCurrentUser } = await import("./api/auth/getCurrentUser");
    vi.mocked(getCurrentUser).mockResolvedValue({
      uid: "test-uid",
      displayName: "テストユーザー",
      email: "test@example.com"
    });
    
    // Act
    render(await HomePage());
    
    // Assert
    expect(screen.getByText("ログイン中です")).toBeInTheDocument();
    expect(screen.getByText(/ユーザー名: テストユーザー/)).toBeInTheDocument();
  });
});
