// functions/src/common.test.ts
import { describe, it, expect } from "vitest";
import { getDiscordAvatarUrl } from "./common";

describe("getDiscordAvatarUrl", () => {
  it("should return undefined if avatarHash is null", () => {
    const userId = "12345";
    const avatarHash = null;
    expect(getDiscordAvatarUrl(userId, avatarHash)).toBeUndefined();
  });

  it("should return png url for non-animated avatar", () => {
    const userId = "12345";
    const avatarHash = "abcdef1234567890";
    const expectedUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`;
    expect(getDiscordAvatarUrl(userId, avatarHash)).toBe(expectedUrl);
  });

  it("should return gif url for animated avatar (starts with a_)", () => {
    const userId = "67890";
    const avatarHash = "a_abcdef1234567890";
    const expectedUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.gif?size=128`;
    expect(getDiscordAvatarUrl(userId, avatarHash)).toBe(expectedUrl);
  });

  it("should handle empty userId (though unlikely in practice)", () => {
    const userId = "";
    const avatarHash = "abcdef1234567890";
    const expectedUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`;
    expect(getDiscordAvatarUrl(userId, avatarHash)).toBe(expectedUrl);
  });

  it("should return undefined for empty avatarHash", () => {
    // テスト名を修正し、期待値を undefined に変更
    const userId = "12345";
    const avatarHash = "";
    // const expectedUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`; // 削除
    expect(getDiscordAvatarUrl(userId, avatarHash)).toBeUndefined(); // 期待値を undefined に変更
  });
});
