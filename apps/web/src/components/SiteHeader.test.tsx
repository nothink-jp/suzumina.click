import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SiteHeader from "./SiteHeader";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: vi.fn(() => "1"),
    toString: vi.fn(() => ""),
  }),
  usePathname: () => "/",
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("SiteHeader", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  it("基本的なヘッダー要素が表示される", () => {
    render(<SiteHeader />);

    // ロゴ・サイト名
    expect(screen.getByText("すずみなくりっく！")).toBeInTheDocument();

    // スキップリンク
    expect(screen.getByText("メインコンテンツにスキップ")).toBeInTheDocument();
  });

  it("デスクトップナビゲーションリンクが表示される", () => {
    render(<SiteHeader />);

    // デスクトップナビゲーション（md:以上で表示）
    const desktopNav = screen.getByLabelText("メインナビゲーション");
    expect(desktopNav).toBeInTheDocument();

    // ナビゲーションリンク
    const videoLink = screen.getAllByText("動画一覧")[0]; // デスクトップ版
    const buttonsLink = screen.getAllByText("ボタン検索")[0]; // デスクトップ版
    const worksLink = screen.getAllByText("作品一覧")[0]; // デスクトップ版

    expect(videoLink).toBeInTheDocument();
    expect(buttonsLink).toBeInTheDocument();
    expect(worksLink).toBeInTheDocument();

    // リンクのhref属性を確認
    expect(videoLink.closest("a")).toHaveAttribute("href", "/videos");
    expect(buttonsLink.closest("a")).toHaveAttribute("href", "/buttons");
    expect(worksLink.closest("a")).toHaveAttribute("href", "/works");
  });

  it("デスクトップ用ボタンが表示される", () => {
    render(<SiteHeader />);

    // マイページ・ログインボタン（デスクトップ版）
    const myPageLinks = screen.getAllByText("マイページ");
    const loginLinks = screen.getAllByText("ログイン");

    // デスクトップ版とモバイル版の両方が存在するため、少なくとも1つは存在することを確認
    expect(myPageLinks.length).toBeGreaterThan(0);
    expect(loginLinks.length).toBeGreaterThan(0);

    // デスクトップ版のリンク先を確認
    const myPageLink = myPageLinks.find(
      (link) => link.closest("a")?.getAttribute("href") === "/users/me",
    );
    const loginLink = loginLinks.find(
      (link) => link.closest("a")?.getAttribute("href") === "/login",
    );

    expect(myPageLink).toBeInTheDocument();
    expect(loginLink).toBeInTheDocument();
  });

  it("モバイルメニューボタンが表示される", () => {
    render(<SiteHeader />);

    // モバイルメニューボタン
    const mobileMenuButton = screen.getByLabelText("メニューを開く");
    expect(mobileMenuButton).toBeInTheDocument();

    // メニューアイコン
    const menuIcon = screen.getByRole("button", { name: "メニューを開く" });
    expect(menuIcon).toBeInTheDocument();
  });

  it("モバイルメニューが開閉できる", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    // モバイルメニューボタンをクリック
    const mobileMenuButton = screen.getByLabelText("メニューを開く");
    await user.click(mobileMenuButton);

    // モバイルナビゲーションが表示される
    expect(screen.getByLabelText("モバイルナビゲーション")).toBeInTheDocument();
    expect(screen.getByLabelText("モバイルメニュー")).toBeInTheDocument();
  });

  it("モバイルメニュー内のリンクが正しく設定される", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    // モバイルメニューを開く
    const mobileMenuButton = screen.getByLabelText("メニューを開く");
    await user.click(mobileMenuButton);

    // モバイルメニュー内のリンクを確認
    const mobileNav = screen.getByLabelText("モバイルメニュー");

    // すべての「動画一覧」リンクを取得し、モバイルメニュー内のものを探す
    const allVideoLinks = screen.getAllByText("動画一覧");
    const mobileVideoLink = allVideoLinks.find((link) =>
      mobileNav.contains(link),
    );
    expect(mobileVideoLink).toBeInTheDocument();
    expect(mobileVideoLink?.closest("a")).toHaveAttribute("href", "/videos");

    // 同様に他のリンクもチェック
    const allButtonLinks = screen.getAllByText("ボタン検索");
    const mobileButtonLink = allButtonLinks.find((link) =>
      mobileNav.contains(link),
    );
    expect(mobileButtonLink).toBeInTheDocument();
    expect(mobileButtonLink?.closest("a")).toHaveAttribute("href", "/buttons");

    const allWorkLinks = screen.getAllByText("作品一覧");
    const mobileWorkLink = allWorkLinks.find((link) =>
      mobileNav.contains(link),
    );
    expect(mobileWorkLink).toBeInTheDocument();
    expect(mobileWorkLink?.closest("a")).toHaveAttribute("href", "/works");

    const allMyPageLinks = screen.getAllByText("マイページ");
    const mobileMyPageLink = allMyPageLinks.find((link) =>
      mobileNav.contains(link),
    );
    expect(mobileMyPageLink).toBeInTheDocument();
    expect(mobileMyPageLink?.closest("a")).toHaveAttribute("href", "/users/me");
  });

  it("アクセシビリティ属性が正しく設定される", () => {
    render(<SiteHeader />);

    // ヘッダー要素
    expect(screen.getByRole("banner")).toBeInTheDocument();

    // ナビゲーション要素
    expect(screen.getByLabelText("メインナビゲーション")).toBeInTheDocument();

    // スキップリンク
    const skipLink = screen.getByText("メインコンテンツにスキップ");
    expect(skipLink).toHaveAttribute("href", "#main-content");

    // ロゴリンクのhref属性を確認
    const logoLink = screen.getByText("すずみなくりっく！").closest("a");
    expect(logoLink).toHaveAttribute("href", "/");

    // モバイルメニューボタンのaria-label
    expect(screen.getByLabelText("メニューを開く")).toBeInTheDocument();
  });

  it("キーボードナビゲーションが動作する", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    // Tabキーでフォーカス移動
    await user.tab();

    // スキップリンクにフォーカス
    expect(screen.getByText("メインコンテンツにスキップ")).toHaveFocus();

    // 次のタブでロゴリンク
    await user.tab();
    expect(screen.getByText("すずみなくりっく！")).toHaveFocus();
  });

  it("正しいCSSクラスが適用される", () => {
    render(<SiteHeader />);

    // ヘッダーのスタイリング
    const header = screen.getByRole("banner");
    expect(header).toHaveClass(
      "bg-background/95",
      "backdrop-blur-sm",
      "border-b",
      "sticky",
      "top-0",
      "z-50",
      "shadow-sm",
    );

    // ロゴのスタイリング - Next.js Linkは要素を変換するため、クラス名は直接確認しない
    const logo = screen.getByText("すずみなくりっく！");
    expect(logo).toBeInTheDocument();
  });

  it("レスポンシブクラスが正しく適用される", () => {
    render(<SiteHeader />);

    // デスクトップナビゲーション（md:以上で表示）
    const desktopNav = screen.getByLabelText("メインナビゲーション");
    expect(desktopNav).toHaveClass("hidden", "md:flex");

    // モバイルメニューボタン（mdより小さい画面で表示）
    const mobileButton = screen.getByLabelText("メニューを開く");
    expect(mobileButton).toHaveClass("md:hidden");

    // レスポンシブ要素の存在確認
    expect(desktopNav).toBeInTheDocument();
    expect(mobileButton).toBeInTheDocument();
  });
});
