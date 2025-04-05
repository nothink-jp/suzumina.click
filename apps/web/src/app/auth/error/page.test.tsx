import { describe, expect, test } from "bun:test";
import { render, screen } from "../../../../tests/test-utils"; // パスを修正
import AuthErrorPage from "./page";

describe("AuthErrorPage", () => {
  test("エラーメッセージとリンクが正しく表示される", () => {
    render(<AuthErrorPage />);

    // タイトルと説明テキストの確認
    expect(screen.getByRole("heading", { name: "認証エラー" })).not.toBeNull();
    expect(
      screen.getByText("ログインに失敗しました。以下の点を確認してください："),
    ).not.toBeNull();

    // リスト項目の確認
    expect(
      screen.getByText(
        "「すずみなふぁみりー」Discordサーバーのメンバーですか？",
      ),
    ).not.toBeNull();
    expect(
      screen.getByText("Discordでの認証を正しく許可しましたか？"),
    ).not.toBeNull();
    expect(screen.getByText("必要な権限を付与しましたか？")).not.toBeNull();

    // リンクの確認
    const retryLink = screen.getByRole("link", { name: "ログインを再試行" });
    expect(retryLink).not.toBeNull();
    expect(retryLink.getAttribute("href")).toBe("/auth/signin");

    const topLink = screen.getByRole("link", { name: "トップページへ戻る" });
    expect(topLink).not.toBeNull();
    expect(topLink.getAttribute("href")).toBe("/");
  });
});
