import type { TagInfo } from "@/lib/audioclips/types";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TagDisplay from "./TagDisplay";

// Next.js のルーターをモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("TagDisplayコンポーネント", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("タグが配列として渡された場合、正しく表示されること", () => {
    const tags = ["タグ1", "タグ2", "タグ3"];
    render(<TagDisplay tags={tags} />);

    // 各タグが表示されていることを確認
    expect(screen.getByText("タグ1")).toBeInTheDocument();
    expect(screen.getByText("タグ2")).toBeInTheDocument();
    expect(screen.getByText("タグ3")).toBeInTheDocument();
  });

  it("TagInfo配列が渡された場合、テキスト部分が表示されること", () => {
    const tagInfos: TagInfo[] = [
      { id: "tag1", text: "タグ1" },
      { id: "tag2", text: "タグ2" },
    ];
    render(<TagDisplay tags={tagInfos} />);

    // 各タグのテキストが表示されていることを確認
    expect(screen.getByText("タグ1")).toBeInTheDocument();
    expect(screen.getByText("タグ2")).toBeInTheDocument();
  });

  it("タグ数が最大表示数を超える場合、残りの数が表示されること", () => {
    // 6個のタグ（デフォルトの最大表示数は5）
    const tags = ["タグ1", "タグ2", "タグ3", "タグ4", "タグ5", "タグ6"];
    render(<TagDisplay tags={tags} />);

    // 最初の5つのタグが表示されていることを確認
    expect(screen.getByText("タグ1")).toBeInTheDocument();
    expect(screen.getByText("タグ2")).toBeInTheDocument();
    expect(screen.getByText("タグ3")).toBeInTheDocument();
    expect(screen.getByText("タグ4")).toBeInTheDocument();
    expect(screen.getByText("タグ5")).toBeInTheDocument();

    // 6つ目のタグは表示されず、残りの数が表示されていることを確認
    expect(screen.queryByText("タグ6")).not.toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("maxDisplayプロパティで表示数を制限できること", () => {
    const tags = ["タグ1", "タグ2", "タグ3", "タグ4"];
    render(<TagDisplay tags={tags} maxDisplay={2} />);

    // 最初の2つのタグのみが表示されていることを確認
    expect(screen.getByText("タグ1")).toBeInTheDocument();
    expect(screen.getByText("タグ2")).toBeInTheDocument();
    expect(screen.queryByText("タグ3")).not.toBeInTheDocument();
    expect(screen.queryByText("タグ4")).not.toBeInTheDocument();

    // 残りの数が表示されていることを確認
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("タグがクリックされると、検索ページに遷移すること", () => {
    const tags = ["タグ1", "タグ2"];
    render(<TagDisplay tags={tags} />);

    // タグをクリック
    fireEvent.click(screen.getByText("タグ1"));

    // 検索ページへの遷移が行われたことを確認
    // URLエンコードされるため、厳密な文字列比較ではなく、mockPushが呼ばれたことを確認
    expect(mockPush).toHaveBeenCalled();
    // URLがエンコードされているため、URLが/searchで始まることを確認
    expect(mockPush.mock.calls[0][0]).toMatch(/^\/search\?tags=/);
  });

  it("onClickプロパティが指定されている場合、検索ページへの遷移の代わりにコールバックが呼ばれること", () => {
    const handleClick = vi.fn();

    const tags = ["タグ1", "タグ2"];
    render(<TagDisplay tags={tags} onClick={handleClick} />);

    // タグをクリック
    fireEvent.click(screen.getByText("タグ1"));

    // コールバックが呼ばれ、検索ページへの遷移は行われないことを確認
    expect(handleClick).toHaveBeenCalledWith("タグ1");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("clickable=falseの場合、タグをクリックしても何も起こらないこと", () => {
    const handleClick = vi.fn();

    const tags = ["タグ1", "タグ2"];
    render(<TagDisplay tags={tags} onClick={handleClick} clickable={false} />);

    // タグをクリック
    fireEvent.click(screen.getByText("タグ1"));

    // コールバックも遷移も呼ばれないことを確認
    expect(handleClick).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("サイズプロパティによって適切なスタイルが適用されること", () => {
    const tags = ["タグ1"];

    // サイズ: small
    const { rerender } = render(<TagDisplay tags={tags} size="sm" />);
    expect(screen.getByText("タグ1").className).toContain("badge-xs");

    // サイズ: large
    rerender(<TagDisplay tags={tags} size="lg" />);
    expect(screen.getByText("タグ1").className).toContain("badge-md");
  });

  it("タグが空の場合、何も表示されないこと", () => {
    const { container } = render(<TagDisplay tags={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("タグがundefinedの場合、何も表示されないこと", () => {
    const { container } = render(<TagDisplay />);
    expect(container.firstChild).toBeNull();
  });
});
