import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { ErrorDisplay } from "./ErrorDisplay";

describe("ErrorDisplay", () => {
  it("エラー説明のみを表示", () => {
    const description = "エラーが発生しました";
    const { container } = render(<ErrorDisplay description={description} />);

    expect(container.innerHTML).toContain(description);
    // リスト要素は表示されていないことを確認
    expect(container.querySelector("ul")).toBeNull();
  });

  it("エラー説明と1つの詳細を表示", () => {
    const description = "エラーが発生しました";
    const details = ["詳細な説明"];

    const { container } = render(
      <ErrorDisplay description={description} details={details} />,
    );

    expect(container.innerHTML).toContain(description);

    const listItems = container.querySelectorAll("li");
    expect(listItems.length).toBe(1);
    expect(listItems[0].textContent).toBe(details[0]);
  });

  it("複数の詳細項目を表示", () => {
    const description = "エラーが発生しました";
    const details = ["1つ目の詳細", "2つ目の詳細", "3つ目の詳細"];

    const { container } = render(
      <ErrorDisplay description={description} details={details} />,
    );

    const listItems = container.querySelectorAll("li");
    expect(listItems.length).toBe(details.length);

    details.forEach((detail, index) => {
      expect(listItems[index].textContent).toBe(detail);
    });
  });

  it("アイコンが適切に表示される", () => {
    const { container } = render(<ErrorDisplay description="エラー" />);

    const icon = container.querySelector("svg");
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  it("空の詳細配列の場合はリストを表示しない", () => {
    const { container } = render(
      <ErrorDisplay description="エラー" details={[]} />,
    );

    expect(container.querySelector("ul")).toBeNull();
  });

  it("スタイルクラスが適切に適用されている", () => {
    const { container } = render(<ErrorDisplay description="エラー" />);

    // エラー表示用の赤系カラーが適用されていることを確認
    const alert = container.firstChild as HTMLElement;
    expect(alert.className).toContain("bg-red-50");

    // 説明文のスタイル
    const description = container.querySelector("p");
    expect(description?.className).toContain("text-red-800");
  });
});
