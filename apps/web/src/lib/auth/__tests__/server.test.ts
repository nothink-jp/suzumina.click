import { describe, expect, it, vi } from "vitest";

// server.ts は better-auth と next/navigation を動的 import する。境界（server.ts 自身）の
// テストなので、ここではプロバイダ（@/lib/better-auth/auth）を mock してよい。
const signInSocial = vi.fn();
vi.mock("@/lib/better-auth/auth", () => ({ auth: { api: { signInSocial } } }));

// redirect は実装上 throw して以降を止める。テストでも同じ挙動にする。
const redirect = vi.fn((url: string) => {
	throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect }));

import { signInWithDiscord } from "../server";

describe("signInWithDiscord", () => {
	it("OAuth URL が返ればその URL へ redirect する", async () => {
		signInSocial.mockResolvedValue({ url: "https://discord.com/oauth" });

		await expect(signInWithDiscord("/")).rejects.toThrow("REDIRECT:https://discord.com/oauth");
		expect(redirect).toHaveBeenCalledWith("https://discord.com/oauth");
	});

	it("OAuth URL が無ければ明示的にエラーを投げる（無言 return しない）", async () => {
		redirect.mockClear();
		signInSocial.mockResolvedValue({ url: undefined });

		await expect(signInWithDiscord("/")).rejects.toThrow(/OAuth URL/);
		expect(redirect).not.toHaveBeenCalled();
	});
});
