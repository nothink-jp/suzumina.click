import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import HeadlessUiDisclosureExample from "./HeadlessUiDisclosureExample";

describe("HeadlessUiDisclosureExample Component", () => {
  it("should render the button and initially hide the panel content", () => {
    // Arrange
    render(<HeadlessUiDisclosureExample />);

    // Assert
    // ボタンが表示されていることを確認
    expect(
      screen.getByRole("button", { name: /Headless UI Disclosure サンプル/i }),
    ).toBeInTheDocument();
    // パネルの内容が最初は表示されていないことを確認 (getBy はエラーになるので queryBy を使う)
    expect(
      screen.queryByText(
        /これは Headless UI の Disclosure コンポーネントのサンプルです。/i,
      ),
    ).not.toBeInTheDocument();
  });

  it("should show the panel content when the button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<HeadlessUiDisclosureExample />);
    const button = screen.getByRole("button", {
      name: /Headless UI Disclosure サンプル/i,
    });

    // Act
    await user.click(button); // ボタンをクリック

    // Assert
    // パネルの内容が表示されることを確認 (非同期で表示される可能性を考慮し findBy を使う)
    expect(
      await screen.findByText(
        /これは Headless UI の Disclosure コンポーネントのサンプルです。/i,
      ),
    ).toBeInTheDocument();
  });

  it("should hide the panel content when the button is clicked twice", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<HeadlessUiDisclosureExample />);
    const button = screen.getByRole("button", {
      name: /Headless UI Disclosure サンプル/i,
    });

    // Act
    await user.click(button); // 1回目のクリック (開く)
    await user.click(button); // 2回目のクリック (閉じる)

    // Assert
    // パネルの内容が再び非表示になることを確認
    expect(
      screen.queryByText(
        /これは Headless UI の Disclosure コンポーネントのサンプルです。/i,
      ),
    ).not.toBeInTheDocument();
  });
});
