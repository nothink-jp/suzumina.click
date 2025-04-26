import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import Header from "./Header";

// AuthContextと関連フックをモック
vi.mock("@/lib/firebase/AuthProvider", () => {
  return {
    useAuth: () => ({
      user: null,
      loading: false,
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Linkコンポーネントのモック
vi.mock("next/link", () => {
  return {
    default: ({
      href,
      children,
      className,
    }: { href: string; children: React.ReactNode; className?: string }) => {
      return (
        <a href={href} className={className}>
          {children}
        </a>
      );
    },
  };
});

// nextのnavigationをモック
vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
    }),
  };
});

describe("Header コンポーネント", () => {
  test("ヘッダーが正しく表示されること", () => {
    render(<Header />);

    // サイト名が表示されていることを確認
    expect(screen.getByText("すずみなくりっく！")).toBeInTheDocument();

    // About リンクが表示されていることを確認
    const aboutLink = screen.getByText("About");
    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink.closest("a")).toHaveAttribute("href", "/about");
  });

  test("メニュードロップダウンが正しく動作すること", async () => {
    render(<Header />);

    // ドロップダウンメニューが表示されていることを確認
    const dropdownSummary = screen.getByText("メニュー");
    expect(dropdownSummary).toBeInTheDocument();

    // 初期状態ではドロップダウンメニューの項目は表示されていないことを確認
    expect(screen.queryByText("メニュー1")).not.toBeVisible();
    expect(screen.queryByText("メニュー2")).not.toBeVisible();

    // ドロップダウンをクリックして項目を表示
    const user = userEvent.setup();
    await user.click(dropdownSummary);

    // ドロップダウン項目が表示されることを確認
    const menu1 = screen.getByText("メニュー1");
    const menu2 = screen.getByText("メニュー2");
    expect(menu1).toBeVisible();
    expect(menu2).toBeVisible();
    expect(menu1.closest("a")).toHaveAttribute("href", "/menu1");
    expect(menu2.closest("a")).toHaveAttribute("href", "/menu2");
  });

  test("トップページへのリンクが正しく設定されていること", () => {
    render(<Header />);

    // サイト名のリンクがトップページに設定されていることを確認
    const titleLink = screen.getByText("すずみなくりっく！");
    expect(titleLink.closest("a")).toHaveAttribute("href", "/");
  });
});
