import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserMetadata } from "firebase-admin/auth";
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

describe("ホームページ", () => {
  it("メインの見出しが表示されること", async () => {
    // 準備 & 実行
    const { container } = render(await HomePage());

    // 検証 - h1タグを直接検索
    const heading = container.querySelector("h1");
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent).toBe("すずみなくりっく！");
  });

  it("Headless UI ディスクロージャーの例示ボタンが表示されること", async () => {
    // 準備 & 実行
    render(await HomePage());

    // 検証 - モック化されたボタンを検索
    const disclosureButton = screen.getByText(/Headless UI Disclosure サンプル/i);
    expect(disclosureButton).toBeInTheDocument();
  });
  
  it("非ログイン時にはAuthButtonが表示されること", async () => {
    // 準備 & 実行
    render(await HomePage());
    
    // 検証
    const authButton = screen.getByTestId("mock-auth-button");
    expect(authButton).toBeInTheDocument();
  });
  
  it("ログイン時にはユーザー情報が表示されること", async () => {
    // 準備 - ログイン状態のモックを設定
    const { getCurrentUser } = await import("./api/auth/getCurrentUser");
    vi.mocked(getCurrentUser).mockResolvedValue({
      uid: "test-uid",
      displayName: "テストユーザー",
      email: "test@example.com",
      emailVerified: false,
      disabled: false,
      metadata: {
        creationTime: "2025-04-01T00:00:00.000Z",
        lastSignInTime: "2025-04-20T00:00:00.000Z",
        toJSON: () => ({ creationTime: "2025-04-01T00:00:00.000Z", lastSignInTime: "2025-04-20T00:00:00.000Z" })
      },
      providerData: [],
      toJSON: function (): object {
        return {
          uid: "test-uid",
          displayName: "テストユーザー",
          email: "test@example.com"
        };
      }
    });
    
    // 実行
    render(await HomePage());
    
    // 検証
    expect(screen.getByText("ログイン中です")).toBeInTheDocument();
    expect(screen.getByText(/ユーザー名: テストユーザー/)).toBeInTheDocument();
  });
});
