import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Hero from "./Hero";

describe("Heroコンポーネント", () => {
  it("タイトルが正しく表示されること", () => {
    // 準備
    render(<Hero title="テストタイトル" />);

    // 検証
    expect(screen.getByText("テストタイトル")).toBeInTheDocument();
  });

  it("サブタイトルが指定された場合に表示されること", () => {
    // 準備
    render(<Hero title="テストタイトル" subtitle="テストサブタイトル" />);

    // 検証
    expect(screen.getByText("テストサブタイトル")).toBeInTheDocument();
  });

  it("サブタイトルが未指定の場合に表示されないこと", () => {
    // 準備
    render(<Hero title="テストタイトル" />);

    // サブタイトルが存在しないことを確認（queryByTextはnullを返す）
    const subtitle = screen.queryByText("テストサブタイトル");
    expect(subtitle).not.toBeInTheDocument();
  });

  it("子要素が正しく表示されること", () => {
    // 準備
    render(
      <Hero title="テストタイトル">
        <button type="button">テストボタン</button>
      </Hero>,
    );

    // 検証
    expect(
      screen.getByRole("button", { name: "テストボタン" }),
    ).toBeInTheDocument();
  });

  it("背景画像が指定された場合にスタイルが適用されること", () => {
    // 準備
    const { container } = render(
      <Hero
        title="テストタイトル"
        backgroundImage="https://example.com/image.jpg"
      />,
    );

    // heroクラスを持つ要素を取得
    const heroElement = container.querySelector(".hero");

    // 検証
    expect(heroElement).toBeInTheDocument();
    expect(heroElement).toHaveStyle({
      backgroundImage: "url(https://example.com/image.jpg)",
    });
  });

  it("配置が'center'のときテキストが中央揃えになること", () => {
    // 準備
    const { container } = render(
      <Hero title="テストタイトル" alignment="center" />,
    );

    // max-w-mdクラスを持つ要素を取得
    const contentElement = container.querySelector(".max-w-md");

    // 検証
    expect(contentElement).toHaveClass("text-center");
  });

  it("配置が'start'のときテキストが左揃えになること", () => {
    // 準備
    const { container } = render(
      <Hero title="テストタイトル" alignment="start" />,
    );

    // max-w-mdクラスを持つ要素を取得
    const contentElement = container.querySelector(".max-w-md");

    // 検証
    expect(contentElement).toHaveClass("text-left");
  });
});
