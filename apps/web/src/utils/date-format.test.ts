import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./date-format";

describe("日付フォーマット関数のテスト", () => {
  // テスト用の固定日付を設定
  const testDate = new Date(2025, 0, 15, 14, 30); // 2025年1月15日 14:30

  describe("formatDate関数", () => {
    it("日付を「YYYY年MM月DD日」形式にフォーマットする", () => {
      // DateTimeFormatの振る舞いをテスト
      const result = formatDate(testDate);
      // 「2025年1月15日」の形式になっていることを確認
      expect(result).toMatch(/2025年[1１]月15日/);
    });
  });

  describe("formatDateTime関数", () => {
    it("日付を「YYYY年MM月DD日 HH:MM」形式にフォーマットする", () => {
      const result = formatDateTime(testDate);
      // 「2025年1月15日 14:30」の形式になっていることを確認
      expect(result).toMatch(/2025年[1１]月15日 14:30/);
    });
  });
});
