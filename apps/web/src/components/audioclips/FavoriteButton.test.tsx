import {
  checkFavoriteStatus,
  toggleFavorite,
} from "@/lib/audioclips/favorites";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FavoriteButton from "./FavoriteButton";

// モック
vi.mock("@/lib/firebase/auth", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { uid: "test-user" },
    loading: false,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/audioclips/favorites", () => ({
  toggleFavorite: vi.fn(),
  checkFavoriteStatus: vi.fn(),
}));

describe("FavoriteButtonコンポーネント", () => {
  const mockClip = {
    id: "test-clip",
    title: "テストクリップ",
    favoriteCount: 5,
  } as any; // テスト用に型を簡略化

  const mockToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (checkFavoriteStatus as any).mockResolvedValue(false);
    (toggleFavorite as any).mockResolvedValue(true);
  });

  it("ボタンが正しくレンダリングされること", async () => {
    render(<FavoriteButton clip={mockClip} />);

    // ボタンが存在することを確認
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();

    // 初期状態ではお気に入り登録されていないこと
    await waitFor(() => {
      expect(button.classList.contains("btn-outline")).toBe(true);
    });

    // お気に入り数が表示されていること
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("ボタンをクリックするとトグル処理が呼ばれること", async () => {
    render(<FavoriteButton clip={mockClip} onToggle={mockToggle} />);

    const button = screen.getByRole("button");
    await userEvent.click(button);

    await waitFor(() => {
      expect(toggleFavorite).toHaveBeenCalledWith("test-user", mockClip);
      expect(mockToggle).toHaveBeenCalledWith(true);
    });

    // トグル後、スタイルが変わること
    expect(button.classList.contains("btn-primary")).toBe(true);
    expect(button.classList.contains("btn-outline")).toBe(false);
  });

  it("お気に入り数の表示を非表示にできること", () => {
    render(<FavoriteButton clip={mockClip} showCount={false} />);

    expect(screen.queryByText("5")).not.toBeInTheDocument();
  });

  it("初期状態でお気に入り登録済みの場合、適切なスタイルで表示されること", async () => {
    (checkFavoriteStatus as any).mockResolvedValue(true);

    render(<FavoriteButton clip={mockClip} />);

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button.classList.contains("btn-primary")).toBe(true);
      expect(button.classList.contains("btn-outline")).toBe(false);
    });
  });

  it("未ログイン時にボタンをクリックするとログインページにリダイレクトされること", async () => {
    const { useAuth } = await import("@/lib/firebase/auth");
    const { useRouter } = await import("next/navigation");

    (useAuth as any).mockReturnValue({
      user: null,
      loading: false,
    });

    const mockPush = vi.fn();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });

    render(<FavoriteButton clip={mockClip} />);

    const button = screen.getByRole("button");
    await userEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/login"));
    expect(toggleFavorite).not.toHaveBeenCalled();
  });
});
