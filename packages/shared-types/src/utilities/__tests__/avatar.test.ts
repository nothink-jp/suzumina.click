import { describe, expect, it } from "vitest";
import { createDiscordAvatarUrl } from "../discord/avatar";

describe("createDiscordAvatarUrl", () => {
	it("userId が空ならデフォルトアバター(0)を返す", () => {
		expect(createDiscordAvatarUrl("", "hash")).toBe(
			"https://cdn.discordapp.com/embed/avatars/0.png",
		);
	});

	it("avatarHash が無い場合は userId に基づくデフォルトアバターを返す", () => {
		// 12 % 5 = 2
		expect(createDiscordAvatarUrl("12", null)).toBe(
			"https://cdn.discordapp.com/embed/avatars/2.png",
		);
		expect(createDiscordAvatarUrl("10", undefined)).toBe(
			"https://cdn.discordapp.com/embed/avatars/0.png",
		);
	});

	it("通常の avatarHash は png として size 付き URL を返す", () => {
		expect(createDiscordAvatarUrl("user1", "abcdef")).toBe(
			"https://cdn.discordapp.com/avatars/user1/abcdef.png?size=128",
		);
	});

	it("a_ で始まる avatarHash はアニメーション gif として扱う", () => {
		expect(createDiscordAvatarUrl("user1", "a_animated", 256)).toBe(
			"https://cdn.discordapp.com/avatars/user1/a_animated.gif?size=256",
		);
	});

	it("size 引数を URL に反映する", () => {
		expect(createDiscordAvatarUrl("user1", "abc", 512)).toContain("?size=512");
	});
});
