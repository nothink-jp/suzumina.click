// functions/src/common.test.ts
import { describe, expect, it } from "vitest";
import { getDiscordAvatarUrl } from "./common";

describe("getDiscordAvatarUrl", () => {
  it("avatarHashがnullの場合はundefinedを返すこと", () => {
    const userId = "12345";
    const avatarHash = null;
    expect(getDiscordAvatarUrl(userId, avatarHash)).toBeUndefined();
  });

  it("通常のアバターの場合はpng形式のURLを返すこと", () => {
    const userId = "12345";
    const avatarHash = "abcdef1234567890";
    const expectedUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`;
    expect(getDiscordAvatarUrl(userId, avatarHash)).toBe(expectedUrl);
  });

  it("アニメーションアバター(a_で始まる)の場合はgif形式のURLを返すこと", () => {
    const userId = "67890";
    const avatarHash = "a_abcdef1234567890";
    const expectedUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.gif?size=128`;
    expect(getDiscordAvatarUrl(userId, avatarHash)).toBe(expectedUrl);
  });

  it("userIdが空文字の場合でも正しくURLを生成すること", () => {
    const userId = "";
    const avatarHash = "abcdef1234567890";
    const expectedUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`;
    expect(getDiscordAvatarUrl(userId, avatarHash)).toBe(expectedUrl);
  });

  it("avatarHashが空文字の場合はundefinedを返すこと", () => {
    const userId = "12345";
    const avatarHash = "";
    expect(getDiscordAvatarUrl(userId, avatarHash)).toBeUndefined();
  });
});
