import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutHero from "./AboutHero";

describe("AboutHeroコンポーネント", () => {
  it("正しくレンダリングされること", () => {
    // 準備 & 実行
    render(<AboutHero />);

    // 検証
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe("すずみなくりっく！について");
  });

  it("テキストコンテンツが表示されること", () => {
    // 準備 & 実行
    render(<AboutHero />);

    // 検証
    expect(screen.getByText(/非公式ファンサイトです/)).toBeInTheDocument();
    expect(
      screen.getByText(/ファンコミュニティの交流の場/),
    ).toBeInTheDocument();
  });

  it("「もっと詳しく」ボタンが表示され、正しいリンク先を持つこと", () => {
    // 準備 & 実行
    render(<AboutHero />);

    // 検証
    const button = screen.getByRole("link", { name: /もっと詳しく/ });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("href", "#about-project");
    expect(button).toHaveClass("btn", "btn-primary");
  });

  it("ヒーロー要素がdaisyUIのスタイルを持つこと", () => {
    // 準備 & 実行
    render(<AboutHero />);

    // 検証
    const heroElement = screen
      .getByRole("heading", { level: 1 })
      .closest(".hero");
    expect(heroElement).toBeInTheDocument();
    expect(heroElement).toHaveClass("bg-base-200", "rounded-box");
  });
});
