import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AboutPage from "./page"; // page.tsx をインポート

// 各コンポーネントをモック化
vi.mock("./_components/AboutHero", () => ({
  default: () => (
    <div data-testid="mock-about-hero">ヒーローセクションモック</div>
  ),
}));

vi.mock("./_components/AboutProject", () => ({
  default: () => (
    <div data-testid="mock-about-project">プロジェクト概要モック</div>
  ),
}));

vi.mock("./_components/AboutTeam", () => ({
  default: () => <div data-testid="mock-about-team">チーム紹介モック</div>,
}));

describe("Aboutページ", () => {
  it("ページのコンテナが正しく表示されること", async () => {
    // 準備 & 実行
    render(await AboutPage());

    // 検証
    // data-testid属性を使用して明示的にコンテナを取得
    const mainContainer = screen.getByTestId("about-page-container");
    expect(mainContainer).toHaveClass("container");
    expect(mainContainer).toHaveClass("mx-auto");
  });

  it("AboutHeroコンポーネントが表示されること", async () => {
    // 準備 & 実行
    render(await AboutPage());

    // 検証
    const aboutHero = screen.getByTestId("mock-about-hero");
    expect(aboutHero).toBeInTheDocument();
  });

  it("AboutProjectコンポーネントが表示されること", async () => {
    // 準備 & 実行
    render(await AboutPage());

    // 検証
    const aboutProject = screen.getByTestId("mock-about-project");
    expect(aboutProject).toBeInTheDocument();
  });

  it("AboutTeamコンポーネントが表示されること", async () => {
    // 準備 & 実行
    render(await AboutPage());

    // 検証
    const aboutTeam = screen.getByTestId("mock-about-team");
    expect(aboutTeam).toBeInTheDocument();
  });
});
