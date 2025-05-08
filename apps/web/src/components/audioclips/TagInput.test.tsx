import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TagInput from "./TagInput";

// タグ関連の機能をモック
vi.mock("@/lib/audioclips/tags", () => ({
  normalizeTag: vi.fn((tag) => tag.toLowerCase().trim()),
  validateTag: vi.fn((tag) => null),
}));

// デバウンス関数が即時に値を返すようにモック
vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

describe("TagInputコンポーネント", () => {
  // 各テスト前の共通セットアップ
  beforeEach(() => {
    vi.clearAllMocks();
    // フォーカス関連の問題を回避するためのモック
    Object.defineProperty(document, "activeElement", {
      writable: true,
      value: document.body,
    });
  });

  it("初期状態で正しく表示されること", () => {
    render(<TagInput />);

    // プレースホルダーと説明テキストが表示されていることを確認
    expect(screen.getByLabelText("タグを入力")).toBeInTheDocument();
    expect(screen.getByText("最大10個まで")).toBeInTheDocument();
  });

  it("初期タグが正しく表示されること", () => {
    const initialTags = ["タグA", "タグB"];
    render(<TagInput initialTags={initialTags} />);

    // 初期タグが表示されていることを確認
    expect(screen.getByText("タグA")).toBeInTheDocument();
    expect(screen.getByText("タグB")).toBeInTheDocument();
  });

  it("TagInfoオブジェクト形式の初期タグも正しく表示されること", () => {
    const initialTags = [
      { id: "tag1", text: "タグ1" },
      { id: "tag2", text: "タグ2" },
    ];
    render(<TagInput initialTags={initialTags} />);

    // 初期タグが表示されていることを確認
    expect(screen.getByText("タグ1")).toBeInTheDocument();
    expect(screen.getByText("タグ2")).toBeInTheDocument();
  });

  it("最大タグ数を超えるとエラーメッセージが表示されること", () => {
    const maxTags = 2;
    render(<TagInput initialTags={["タグ1", "タグ2"]} maxTags={maxTags} />);

    // 入力フィールドがないことを確認
    expect(screen.queryByLabelText("タグを入力")).not.toBeInTheDocument();

    // 上限メッセージが表示されていることを確認
    expect(screen.getByText("タグの上限に達しました")).toBeInTheDocument();
  });

  it("読み取り専用モードでは編集機能が無効化されること", () => {
    render(<TagInput initialTags={["タグ1", "タグ2"]} readOnly={true} />);

    // 削除ボタンがないことを確認
    expect(screen.queryByLabelText(/タグ.*を削除/)).not.toBeInTheDocument();

    // 入力フィールドがないことを確認
    expect(screen.queryByLabelText("タグを入力")).not.toBeInTheDocument();
  });

  it("無効化モードでは編集機能が無効化されること", () => {
    render(<TagInput initialTags={["タグ1", "タグ2"]} disabled={true} />);

    // 入力コンテナがdisabledのクラスを持っていることを確認
    expect(screen.getByText("タグ1").closest(".flex")).toHaveClass(
      "bg-base-200",
    );
    expect(screen.getByText("タグ1").closest(".flex")).toHaveClass(
      "cursor-not-allowed",
    );
  });

  // タグ候補表示のテストを変更
  it("タグ候補表示のモック関数が正しく呼び出されること", async () => {
    // テスト用のカスタムモック関数
    const mockSearchTagsAction = vi.fn().mockResolvedValue({
      tags: [
        { id: "タグ1", text: "タグ1", count: 10 },
        { id: "タグ2", text: "タグ2", count: 5 },
      ],
    });

    // コンポーネントのレンダリング
    render(
      <TagInput
        searchTagsAction={mockSearchTagsAction}
        searchOnInput={true} // 入力時に検索するオプションを有効化
      />,
    );

    // 入力フィールドの取得
    const input = screen.getByLabelText("タグを入力");

    // 入力フィールドにフォーカスを当てる
    await act(async () => {
      input.focus();
    });

    // 直接inputのvalueを変更し、changeイベントを発火
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, "タグ");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    // モック関数が1秒以内に呼び出されることを検証
    await waitFor(
      () => {
        expect(mockSearchTagsAction).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    // 正しい引数で呼び出されたことを検証
    expect(mockSearchTagsAction).toHaveBeenCalledWith({ query: "タグ" });
  });
});
