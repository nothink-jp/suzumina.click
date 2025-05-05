import { revokeSession } from "@/actions/auth/actions";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthButton from "./AuthButton";

// モックの設定
vi.mock("@/lib/firebase/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  auth: {
    /* モック認証オブジェクト */
  },
}));

vi.mock("@/actions/auth/actions", () => ({
  revokeSession: vi.fn().mockResolvedValue(true),
}));

describe("AuthButton コンポーネントのテスト", () => {
  // 基本的なモックの設定
  const mockRouter = {
    push: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのルーターモック
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);

    // デフォルトの認証状態モック（ローディング状態）
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      loading: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("ローディング中はスピナーを表示する", () => {
    // ローディング状態のモック
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      loading: true,
    });

    render(<AuthButton />);

    // スピナーが表示されていることを確認（data-testid属性を使用）
    const spinner = screen.getByTestId("loading-spinner");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("loading");
  });

  it("ユーザーがログインしていない場合はログインボタンを表示する", () => {
    // 未ログイン状態のモック
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<AuthButton />);

    // ログインボタンが表示されていることを確認
    const loginButton = screen.getByRole("button", {
      name: "Discordでログイン",
    });
    expect(loginButton).toBeInTheDocument();
  });

  it("ユーザーがログインしている場合はアバターとドロップダウンを表示する", () => {
    // ログイン状態のモック
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        uid: "test-user-id",
        displayName: "テストユーザー",
        photoURL: "https://example.com/avatar.jpg",
      },
      loading: false,
    });

    render(<AuthButton />);

    // アバター画像が表示されていることを確認
    const avatar = screen.getByRole("img", { name: "プロフィール画像" });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("ログアウトボタンをクリックするとFirebaseとセッションクッキーの両方からログアウトする", async () => {
    // ログイン状態のモック
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        uid: "test-user-id",
        displayName: "テストユーザー",
        photoURL: "https://example.com/avatar.jpg",
      },
      loading: false,
    });

    // ログアウト成功のモック
    (signOut as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    render(<AuthButton />);

    // アバターをクリックしてドロップダウンを表示
    const avatar = screen.getByRole("img", { name: "プロフィール画像" });
    userEvent.click(avatar);

    // ログアウトボタンをクリック
    const logoutButton = screen.getByRole("button", { name: "ログアウト" });
    userEvent.click(logoutButton);

    // 非同期処理の完了を待機
    await waitFor(() => {
      // Firebaseのログアウト関数が呼ばれることを確認
      expect(signOut).toHaveBeenCalled();

      // セッションクッキーの削除関数が呼ばれることを確認
      expect(revokeSession).toHaveBeenCalled();

      // ホームページへのリダイレクトが行われることを確認
      expect(mockRouter.push).toHaveBeenCalledWith("/");
    });
  });

  it("ログアウト処理でエラーが発生した場合、エラーログが出力される", async () => {
    // ログイン状態のモック
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        uid: "test-user-id",
        displayName: "テストユーザー",
        photoURL: "https://example.com/avatar.jpg",
      },
      loading: false,
    });

    // ログアウト失敗のモック
    (signOut as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("ログアウトエラー"),
    );

    // コンソールエラーをスパイ
    const consoleSpy = vi.spyOn(console, "error");

    render(<AuthButton />);

    // アバターをクリックしてドロップダウンを表示
    const avatar = screen.getByRole("img", { name: "プロフィール画像" });
    userEvent.click(avatar);

    // ログアウトボタンをクリック
    const logoutButton = screen.getByRole("button", { name: "ログアウト" });
    userEvent.click(logoutButton);

    // エラーログが出力されることを確認
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("ログアウト中にエラーが発生しました"),
        expect.any(Error),
      );
    });

    // リダイレクトが行われないことを確認
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("photoURLがnullの場合はデフォルト画像を表示する", () => {
    // photoURLがnullのユーザー
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        uid: "test-user-id",
        displayName: "テストユーザー",
        photoURL: null,
      },
      loading: false,
    });

    render(<AuthButton />);

    // デフォルト画像が表示されていることを確認
    const avatar = screen.getByRole("img", { name: "プロフィール画像" });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("src", "https://placehold.jp/150x150.png");
  });
});
