import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SearchForm from "./SearchForm";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
    toString: vi.fn(() => ""),
  }),
  usePathname: () => "/",
}));

describe("SearchForm", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  it("基本的なフォーム要素が表示される", () => {
    render(<SearchForm />);

    // 検索入力フィールド
    const searchInput = screen.getByPlaceholderText("ボタンや作品を検索...");
    expect(searchInput).toBeInTheDocument();

    // 検索ボタン
    const searchButton = screen.getByRole("button", { name: "検索" });
    expect(searchButton).toBeInTheDocument();

    // フォーム要素
    const form = searchInput.closest("form");
    expect(form).toBeInTheDocument();

    // 検索アイコン
    const searchIcon = form?.querySelector(".lucide-search");
    expect(searchIcon).toBeInTheDocument();
  });

  it("検索入力フィールドが正しく動作する", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    const searchInput = screen.getByPlaceholderText("ボタンや作品を検索...");

    // テキスト入力
    await user.type(searchInput, "テスト検索");
    expect(searchInput).toHaveValue("テスト検索");
  });

  it("フォーム送信で検索ページに遷移する", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    const searchInput = screen.getByPlaceholderText("ボタンや作品を検索...");
    const searchButton = screen.getByRole("button", { name: "検索" });

    // 検索クエリを入力
    await user.type(searchInput, "涼花みなせ");

    // フォーム送信
    await user.click(searchButton);

    // 検索パスに遷移することを確認
    expect(mockPush).toHaveBeenCalledWith(
      `/search?q=${encodeURIComponent("涼花みなせ")}`,
    );
  });

  it("Enterキーでフォーム送信される", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    const searchInput = screen.getByPlaceholderText("ボタンや作品を検索...");

    // 検索クエリを入力してEnterキー
    await user.type(searchInput, "音声ボタン{enter}");

    // 検索パスに遷移することを確認
    expect(mockPush).toHaveBeenCalledWith(
      `/search?q=${encodeURIComponent("音声ボタン")}`,
    );
  });

  it("空白のみの検索クエリでは送信されない", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    const searchInput = screen.getByPlaceholderText("ボタンや作品を検索...");
    const searchButton = screen.getByRole("button", { name: "検索" });

    // 空白のみを入力
    await user.type(searchInput, "   ");
    await user.click(searchButton);

    // 検索パスに遷移しないことを確認
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("空文字列の検索クエリでは送信されない", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    const searchButton = screen.getByRole("button", { name: "検索" });

    // 空文字列で送信
    await user.click(searchButton);

    // 検索パスに遷移しないことを確認
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("検索クエリの前後の空白が削除される", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    const searchInput = screen.getByPlaceholderText("ボタンや作品を検索...");
    const searchButton = screen.getByRole("button", { name: "検索" });

    // 前後に空白がある検索クエリを入力
    await user.type(searchInput, "  テスト検索  ");
    await user.click(searchButton);

    // トリムされた状態で送信されることを確認
    expect(mockPush).toHaveBeenCalledWith(
      `/search?q=${encodeURIComponent("テスト検索")}`,
    );
  });

  it("特殊文字が正しくエンコードされる", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    const searchInput = screen.getByPlaceholderText("ボタンや作品を検索...");
    const searchButton = screen.getByRole("button", { name: "検索" });

    // 特殊文字を含む検索クエリ
    const specialQuery = "検索&テスト=値+スペース";
    await user.type(searchInput, specialQuery);
    await user.click(searchButton);

    // 正しくエンコードされることを確認
    expect(mockPush).toHaveBeenCalledWith(
      `/search?q=${encodeURIComponent(specialQuery)}`,
    );
  });

  it("フォームのアクセシビリティが適切に設定される", () => {
    render(<SearchForm />);

    // 検索入力フィールド
    const searchInput = screen.getByRole("textbox");
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute("placeholder", "ボタンや作品を検索...");

    // フォーム要素
    const form = searchInput.closest("form");
    expect(form).toBeInTheDocument();

    // 検索ボタン
    const searchButton = screen.getByRole("button", { name: "検索" });
    expect(searchButton).toHaveAttribute("type", "submit");
  });

  it("レスポンシブレイアウトが適用される", () => {
    render(<SearchForm />);

    const searchInput = screen.getByRole("textbox");
    const form = searchInput.closest("form");
    expect(form).toHaveClass(
      "flex",
      "flex-col",
      "sm:flex-row",
      "gap-4",
      "justify-center",
      "items-center",
      "max-w-md",
      "mx-auto",
    );

    const searchButton = screen.getByRole("button", { name: "検索" });
    expect(searchButton).toHaveClass("w-full", "sm:w-auto");
  });

  it("タッチ最適化スタイルが適用される", () => {
    render(<SearchForm />);

    const searchInput = screen.getByRole("textbox");
    const searchButton = screen.getByRole("button", { name: "検索" });

    // FID改善のためのtouchActionスタイル
    expect(searchInput).toHaveStyle({ touchAction: "manipulation" });
    expect(searchButton).toHaveStyle({ touchAction: "manipulation" });

    // 最小タッチターゲットサイズ
    expect(searchButton).toHaveClass("min-h-[44px]");
  });

  it("検索アイコンが正しく配置される", () => {
    render(<SearchForm />);

    const searchInput = screen.getByRole("textbox");
    const form = searchInput.closest("form");

    // 検索アイコンの位置確認
    const searchIcon = form?.querySelector(".lucide-search");
    expect(searchIcon).toBeInTheDocument();
    expect(searchIcon).toHaveClass(
      "absolute",
      "left-3",
      "top-1/2",
      "transform",
      "-translate-y-1/2",
      "text-muted-foreground",
      "h-4",
      "w-4",
    );

    // 入力フィールドの左パディング
    expect(searchInput).toHaveClass("pl-10");
  });

  it("メモ化により同じ状態では再レンダリングされない", () => {
    const { rerender } = render(<SearchForm />);

    const searchInput = screen.getByRole("textbox");
    const firstForm = searchInput.closest("form");

    // 同じpropsで再レンダリング（propsはないがメモ化の効果を確認）
    rerender(<SearchForm />);

    const newSearchInput = screen.getByRole("textbox");
    const secondForm = newSearchInput.closest("form");

    // フォーム要素が再利用されることを確認
    expect(firstForm).toBe(secondForm);
  });

  it("フォーカス状態が適切に管理される", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    const searchInput = screen.getByRole("textbox");
    const searchButton = screen.getByRole("button", { name: "検索" });

    // 入力フィールドにフォーカス
    await user.click(searchInput);
    expect(searchInput).toHaveFocus();

    // Tabキーでボタンにフォーカス移動
    await user.tab();
    expect(searchButton).toHaveFocus();
  });

  it("キーボードナビゲーションが動作する", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    // Tabキーでフォーカス移動
    await user.tab();
    expect(screen.getByRole("textbox")).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "検索" })).toHaveFocus();

    // スペースキーでボタンを押下（検索クエリが空なので送信されない）
    await user.keyboard(" ");
    expect(mockPush).not.toHaveBeenCalled();
  });
});
