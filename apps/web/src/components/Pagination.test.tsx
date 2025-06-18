import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Pagination from "./Pagination";

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
  usePathname: () => "/test",
}));

describe("Pagination", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  it("基本的なページネーションが表示される", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        itemsPerPage={10}
      />,
    );

    expect(screen.getByText("1 / 5ページ")).toBeInTheDocument();
    expect(screen.getByText("50件中 1-10件")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "前のページ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "次のページ" })).toBeEnabled();
  });

  it("中間ページで前後のボタンが有効になる", () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={5}
        totalItems={50}
        itemsPerPage={10}
      />,
    );

    expect(screen.getByText("3 / 5ページ")).toBeInTheDocument();
    expect(screen.getByText("50件中 21-30件")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "前のページ" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "次のページ" })).toBeEnabled();
  });

  it("最後のページで次のボタンが無効になる", () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={5}
        totalItems={50}
        itemsPerPage={10}
      />,
    );

    expect(screen.getByText("5 / 5ページ")).toBeInTheDocument();
    expect(screen.getByText("50件中 41-50件")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "前のページ" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "次のページ" })).toBeDisabled();
  });

  it("次のページボタンをクリックするとページが変更される", async () => {
    const user = userEvent.setup();

    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        itemsPerPage={10}
      />,
    );

    const nextButton = screen.getByRole("button", { name: "次のページ" });
    await user.click(nextButton);

    expect(mockReplace).toHaveBeenCalledWith("/test?page=2");
  });

  it("前のページボタンをクリックするとページが変更される", async () => {
    const user = userEvent.setup();

    render(
      <Pagination
        currentPage={3}
        totalPages={5}
        totalItems={50}
        itemsPerPage={10}
      />,
    );

    const prevButton = screen.getByRole("button", { name: "前のページ" });
    await user.click(prevButton);

    expect(mockReplace).toHaveBeenCalledWith("/test?page=2");
  });

  it("キーボードナビゲーションが動作する", async () => {
    const user = userEvent.setup();

    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={50}
        itemsPerPage={10}
      />,
    );

    const nextButton = screen.getByRole("button", { name: "次のページ" });
    await user.tab(); // フォーカスを移動
    await user.keyboard("{Enter}"); // Enterキーで実行

    expect(mockReplace).toHaveBeenCalled();
  });

  it("アクセシビリティ属性が正しく設定される", () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={50}
        itemsPerPage={10}
      />,
    );

    const navigation = screen.getByRole("navigation", {
      name: "ページネーション",
    });
    expect(navigation).toBeInTheDocument();

    const prevButton = screen.getByRole("button", { name: "前のページ" });
    const nextButton = screen.getByRole("button", { name: "次のページ" });

    expect(prevButton).toHaveAttribute("aria-label", "前のページ");
    expect(nextButton).toHaveAttribute("aria-label", "次のページ");
  });

  it("総ページ数が1の場合はボタンが表示されない", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={1}
        totalItems={5}
        itemsPerPage={10}
      />,
    );

    expect(screen.getByText("1 / 1ページ")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "前のページ" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "次のページ" }),
    ).not.toBeInTheDocument();
  });

  it("アイテムが0件の場合は適切に表示される", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={1}
        totalItems={0}
        itemsPerPage={10}
      />,
    );

    expect(screen.getByText("0件")).toBeInTheDocument();
  });

  it("最後のページでアイテム数が端数の場合は正しく表示される", () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={3}
        totalItems={25}
        itemsPerPage={10}
      />,
    );

    expect(screen.getByText("25件中 21-25件")).toBeInTheDocument();
  });
});
