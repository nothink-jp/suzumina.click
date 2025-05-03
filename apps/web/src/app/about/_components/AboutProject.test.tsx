import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutProject from "./AboutProject";

describe("AboutProjectコンポーネント", () => {
  it("プロジェクト概要の見出しが正しくレンダリングされること", () => {
    // 準備 & 実行
    render(<AboutProject />);

    // 検証
    const heading = screen.getByRole("heading", {
      name: /プロジェクトについて/,
    });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass("text-3xl", "font-bold");
  });

  it("特徴カードが4つ表示されること", () => {
    // 準備 & 実行
    render(<AboutProject />);

    // 検証
    // features配列の長さと同じ数のカードタイトルがあることを確認
    const cardTitles = screen
      .getAllByRole("heading", { level: 3 })
      .filter(
        (el) =>
          el.classList.contains("card-title") ||
          [
            "最新情報の提供",
            "活動アーカイブ",
            "コミュニティ支援",
            "オープンソース",
          ].includes(el.textContent || ""),
      );

    expect(cardTitles).toHaveLength(4);
  });

  it("特徴カードに適切なアイコンが表示されること", () => {
    // 準備 & 実行
    render(<AboutProject />);

    // 検証 - テキストコンテンツに絵文字が含まれているか確認
    const emojiElements = [
      screen.getByText("📢"),
      screen.getByText("📚"),
      screen.getByText("👥"),
      screen.getByText("💻"),
    ];

    for (const element of emojiElements) {
      expect(element).toBeInTheDocument();
    }
  });

  it("サイトポリシーセクションが表示されること", () => {
    // 準備 & 実行
    render(<AboutProject />);

    // 検証
    const policyHeading = screen.getByRole("heading", {
      name: /サイトポリシー/,
    });
    expect(policyHeading).toBeInTheDocument();

    const policyList = screen.getByRole("list");
    expect(policyList).toBeInTheDocument();

    const listItems = screen.getAllByRole("listitem");
    expect(listItems.length).toBeGreaterThanOrEqual(5); // 少なくとも5つのポリシー項目が表示されていること
  });
});
