import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutTeam from "./AboutTeam";

describe("AboutTeamコンポーネント", () => {
  it("チーム紹介の見出しが正しくレンダリングされること", () => {
    // 準備 & 実行
    render(<AboutTeam />);

    // 検証
    const heading = screen.getByRole("heading", { name: /プロジェクトチーム/ });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass("text-3xl", "font-bold");
  });

  it("チームメンバーのカードが正しく表示されること", () => {
    // 準備 & 実行
    render(<AboutTeam />);

    // 検証
    // teamMembers配列の長さと同じ数のメンバーカードが表示されていることを確認
    const memberNames = ["田中 開発", "佐藤 デザイン", "鈴木 編集"];
    for (const name of memberNames) {
      const nameHeading = screen.getByRole("heading", { name });
      expect(nameHeading).toBeInTheDocument();
      expect(nameHeading).toHaveClass("card-title");
    }
  });

  it("メンバーのロールがバッジとして表示されること", () => {
    // 準備 & 実行
    render(<AboutTeam />);

    // 検証
    const roles = ["代表 / エンジニア", "UI/UXデザイナー", "コンテンツ編集"];
    for (const role of roles) {
      const roleBadge = screen.getByText(role);
      expect(roleBadge).toBeInTheDocument();
      expect(roleBadge).toHaveClass("badge", "badge-primary");
    }
  });

  it("メンバーのアバター画像が表示されること", () => {
    // 準備 & 実行
    render(<AboutTeam />);

    // 検証
    const avatarImages = screen.getAllByRole("img");
    expect(avatarImages).toHaveLength(3); // 3人分のアバター画像

    avatarImages.forEach((img, index) => {
      expect(img).toHaveAttribute("src");
      expect(img).toHaveAttribute("alt", expect.stringContaining("のアバター"));
      expect(img).toHaveClass("rounded-xl");
    });
  });

  it("参加呼びかけセクションが表示されること", () => {
    // 準備 & 実行
    render(<AboutTeam />);

    // 検証
    const callToActionHeading = screen.getByRole("heading", {
      name: /プロジェクトに参加しませんか？/,
    });
    expect(callToActionHeading).toBeInTheDocument();

    const contactButton = screen.getByRole("button", { name: /お問い合わせ/ });
    expect(contactButton).toBeInTheDocument();
    expect(contactButton).toHaveClass("btn", "btn-primary");
  });
});
