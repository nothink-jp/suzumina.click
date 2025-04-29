import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UserStatusCard from "./UserStatusCard";

// Next.jsのナビゲーションをモック
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Firebaseの認証関連をモック
vi.mock("firebase/auth", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/lib/firebase/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  auth: {},
}));

// テスト用のモックユーザーデータ
const mockUser = {
  uid: "test-uid",
  displayName: "テストユーザー",
  email: "test@example.com",
  emailVerified: true,
  phoneNumber: null,
  photoURL: "https://example.com/avatar.jpg",
  disabled: false,
  metadata: {
    creationTime: "2025-04-01T00:00:00.000Z",
    lastSignInTime: "2025-04-28T00:00:00.000Z",
    toJSON: () => ({
      creationTime: "2025-04-01T00:00:00.000Z",
      lastSignInTime: "2025-04-28T00:00:00.000Z",
    }),
  },
  providerData: [],
  toJSON: () => ({
    uid: "test-uid",
    displayName: "テストユーザー",
    email: "test@example.com",
  }),
};

// テスト前の環境変数設定
const originalEnv = process.env;

describe("UserStatusCardコンポーネント", () => {
  // 各テスト前に環境変数をセットアップ
  beforeEach(() => {
    // 環境変数をモック
    vi.stubEnv("NEXT_PUBLIC_DISCORD_CLIENT_ID", "mock-client-id");
    vi.stubEnv(
      "NEXT_PUBLIC_DISCORD_REDIRECT_URI",
      "http://localhost:3000/auth/callback",
    );

    // localStorage APIをモック
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // location.hrefをモック
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost:3000" },
      writable: true,
    });
  });

  // 各テスト後に環境をクリーンアップ
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("ログイン状態で正しく表示されること", () => {
    // 準備
    render(<UserStatusCard user={mockUser} />);

    // 検証
    expect(screen.getByText("ログイン中です")).toBeInTheDocument();

    // テキストを含む要素を取得するためにテキスト関数を使用
    expect(
      screen.getByText((content, element) => {
        return element?.textContent === "ユーザー名: テストユーザー";
      }),
    ).toBeInTheDocument();

    // プロフィールへのリンクが存在すること
    const profileLink = screen.getByRole("link", { name: "プロフィール" });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute("href", "/profile");
  });

  it("ユーザー画像がある場合に表示されること", () => {
    // 準備
    render(<UserStatusCard user={mockUser} />);

    // 検証
    const avatar = screen.getByRole("img");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("src", mockUser.photoURL);
    expect(avatar).toHaveAttribute("alt", `${mockUser.displayName}のアバター`);
  });

  it("表示名がない場合に「未設定」と表示されること", () => {
    // 準備 - 表示名なしのユーザー
    const userWithoutName = {
      ...mockUser,
      displayName: null,
    };

    render(<UserStatusCard user={userWithoutName} />);

    // 検証 - 複数要素に分かれたテキストを検索
    expect(
      screen.getByText((content, element) => {
        return element?.textContent === "ユーザー名: 未設定";
      }),
    ).toBeInTheDocument();
  });

  it("非ログイン状態で正しく表示されること", () => {
    // 準備
    render(<UserStatusCard user={null} />);

    // 検証
    expect(screen.getByText("ログインしていません")).toBeInTheDocument();
    expect(
      screen.getByText("機能をすべて利用するにはログインしてください"),
    ).toBeInTheDocument();

    // ログインボタンが存在すること
    const loginButton = screen.getByRole("button", {
      name: "Discordでログイン",
    });
    expect(loginButton).toBeInTheDocument();
  });
});
