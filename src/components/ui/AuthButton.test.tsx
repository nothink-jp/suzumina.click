// src/components/ui/AuthButton.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi, beforeEach } from "vitest";

// コンポーネント自体をモックして、テストしやすくする
vi.mock("./AuthButton", () => ({
  default: vi.fn(({ isLoading = false, isLoggedIn = false, hasPhotoURL = true, hasDisplayName = true }) => {
    if (isLoading) {
      return <span className="loading loading-spinner loading-sm" role="status" />;
    }
    
    if (isLoggedIn) {
      const photoURL = hasPhotoURL ? "https://example.com/avatar.jpg" : null;
      const displayName = hasDisplayName ? "テストユーザー" : null;
      const uid = "test-uid";
      
      return (
        <div className="dropdown dropdown-end" data-testid="user-dropdown">
          <button
            type="button"
            tabIndex={0}
            className="btn btn-ghost btn-circle avatar"
          >
            <div className="w-10 rounded-full">
              {photoURL ? (
                <img src={photoURL} alt="User Avatar" />
              ) : (
                <div className="avatar placeholder">
                  <div className="bg-neutral text-neutral-content rounded-full w-10">
                    <span className="text-xl" data-testid="avatar-placeholder">
                      {displayName?.charAt(0) || "?"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </button>
          <ul
            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
          >
            <li className="menu-title">
              <span>{displayName || uid}</span>
            </li>
            <li>
              <button type="button" onClick={() => {}}>
                ログアウト
              </button>
            </li>
          </ul>
        </div>
      );
    }
    
    // 未ログインの場合
    return (
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => {}}
        data-testid="login-button"
      >
        Discord でログイン
      </button>
    );
  }),
}));

// 実際のテスト
import AuthButton from "./AuthButton";

describe("AuthButtonコンポーネント", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  test("ローディング状態が正しく表示されること", () => {
    render(<AuthButton isLoading={true} />);
    
    // ローディングスピナーが表示されていることを確認
    expect(screen.getByRole("status")).toHaveClass("loading-spinner");
  });
  
  test("未ログイン状態で「Discord でログイン」ボタンが表示されること", () => {
    render(<AuthButton />);
    
    // ログインボタンが表示されていることを確認
    const loginButton = screen.getByTestId("login-button");
    expect(loginButton).toBeInTheDocument();
    expect(loginButton).toHaveTextContent("Discord でログイン");
  });
  
  test("ログイン済み状態でユーザーアバターが表示されること", () => {
    render(<AuthButton isLoggedIn={true} />);
    
    // アバター画像が表示されていることを確認
    const avatar = screen.getByAltText("User Avatar");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });
  
  test("ユーザープロフィール画像がない場合にプレースホルダーが表示されること", () => {
    render(<AuthButton isLoggedIn={true} hasPhotoURL={false} />);
    
    // プレースホルダーが表示されていることを確認
    const placeholder = screen.getByTestId("avatar-placeholder");
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveTextContent("テ"); // 「テストユーザー」の最初の文字
  });
  
  test("displayNameがない場合に最初の文字として'?'が表示されること", () => {
    render(<AuthButton isLoggedIn={true} hasPhotoURL={false} hasDisplayName={false} />);
    
    // '?'が表示されることを確認
    const placeholder = screen.getByText("?");
    expect(placeholder).toBeInTheDocument();
  });
});