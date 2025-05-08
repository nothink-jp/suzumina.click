/**
 * タグ関連ユーティリティ関数のテスト
 *
 * このテストでは、クライアントサイドで利用可能な関数のみをテストします
 * Server Actionsに移行した関数は別のテストファイルで扱います
 */
import { describe, expect, it } from "vitest";
import { normalizeTag, validateTag, validateTags } from "./tags";

describe("タグ正規化関数のテスト", () => {
  it("タグの先頭と末尾の空白を削除すること", () => {
    expect(normalizeTag("  テスト  ")).toBe("テスト");
  });

  it("タグを小文字に変換すること", () => {
    expect(normalizeTag("TEST")).toBe("test");
  });

  it("英数字、日本語、ハイフン、アンダースコアを許可すること", () => {
    expect(normalizeTag("テスト_test-123")).toBe("テスト_test-123");
  });

  it("特殊文字を削除すること", () => {
    expect(normalizeTag("テスト!@#$%^&*()+=")).toBe("テスト");
  });

  it("連続したハイフンやアンダースコアを1つにまとめること", () => {
    expect(normalizeTag("test__tag--example")).toBe("test_tag-example");
  });

  it("日本語の漢字、ひらがな、カタカナを許可すること", () => {
    expect(normalizeTag("漢字ひらがなカタカナ")).toBe("漢字ひらがなカタカナ");
  });
});

describe("タグバリデーション関数のテスト", () => {
  it("空のタグに対してエラーメッセージを返すこと", () => {
    expect(validateTag("")).toBe("タグを入力してください");
    expect(validateTag("   ")).toBe("タグを入力してください");
  });

  it("最大長を超えるタグに対してエラーメッセージを返すこと", () => {
    // 31文字のタグ (MAX_TAG_LENGTH = 30)
    const longTag = "あ".repeat(31);
    expect(validateTag(longTag)).toBe("タグは30文字以内で入力してください");
  });

  it("有効なタグに対してnullを返すこと", () => {
    expect(validateTag("テスト")).toBeNull();
    expect(validateTag("test-tag")).toBeNull();
    expect(validateTag("テスト_tag123")).toBeNull();
  });
});

describe("タグリストバリデーション関数のテスト", () => {
  it("最大数を超えるタグリストに対してエラーメッセージを返すこと", () => {
    // 11個のタグ (MAX_TAGS_PER_CLIP = 10)
    const tooManyTags = Array(11)
      .fill("")
      .map((_, i) => `tag${i}`);
    expect(validateTags(tooManyTags)).toBe("タグは10個までしか設定できません");
  });

  it("重複するタグを含むリストに対してエラーメッセージを返すこと", () => {
    expect(validateTags(["テスト", "テスト"])).toBe(
      "重複したタグが含まれています",
    );
    expect(validateTags(["テスト", "test", "TEST"])).toBe(
      "重複したタグが含まれています",
    ); // 正規化後に重複
  });

  it("無効なタグを含むリストに対してエラーメッセージを返すこと", () => {
    expect(validateTags(["テスト", ""])).toBe("タグを入力してください");
    expect(validateTags(["テスト", "あ".repeat(31)])).toBe(
      "タグは30文字以内で入力してください",
    );
  });

  it("有効なタグリストに対してnullを返すこと", () => {
    expect(validateTags(["テスト", "test-tag"])).toBeNull();
    expect(validateTags(["タグ1", "タグ2", "タグ3"])).toBeNull();
  });
});
