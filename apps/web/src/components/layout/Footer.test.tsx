import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Footer from "./Footer";

describe("Footer Component", () => {
  it("should render the copyright notice with the current year", () => {
    // Arrange
    const currentYear = new Date().getFullYear();
    render(<Footer />);

    // Act
    const copyrightText = screen.getByText(/Copyright ©/i); // テキストの一部で検索

    // Assert
    expect(copyrightText).toBeInTheDocument();
    // 年が含まれているかを確認 (より堅牢なテスト)
    expect(copyrightText.textContent).toContain(`Copyright © ${currentYear}`);
    // 非公式ファンサイトである旨の注意書きが表示されるか
    expect(
      screen.getByText(/このサイトは涼花みなせさんの非公式ファンサイトであり/),
    ).toBeInTheDocument();
  });
});
