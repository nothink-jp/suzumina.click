import { SUZUMINA_GUILD_ID } from "@suzumina.click/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { extractAvatarHash, fetchDiscordGuildMembership } from "../discord-guild";

describe("extractAvatarHash", () => {
	it("Discord アバター URL からハッシュを抽出", () => {
		expect(extractAvatarHash("https://cdn.discordapp.com/avatars/123/abc123def.png")).toBe(
			"abc123def",
		);
	});
	it("null/空/非一致は null", () => {
		expect(extractAvatarHash(null)).toBeNull();
		expect(extractAvatarHash(undefined)).toBeNull();
		expect(extractAvatarHash("https://example.com/x.png")).toBeNull();
	});
});

describe("fetchDiscordGuildMembership", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function stubFetch(impl: () => Promise<Response> | Response) {
		vi.stubGlobal("fetch", vi.fn(impl));
	}

	it("対象 Guild に所属 → isMember true", async () => {
		stubFetch(() =>
			Promise.resolve(
				new Response(
					JSON.stringify([{ id: SUZUMINA_GUILD_ID, joined_at: "2025-01-01T00:00:00Z" }]),
					{ status: 200 },
				),
			),
		);
		const r = await fetchDiscordGuildMembership("token", "123");
		expect(r).toMatchObject({ guildId: SUZUMINA_GUILD_ID, userId: "123", isMember: true });
	});

	it("対象 Guild に非所属 → isMember false", async () => {
		stubFetch(() =>
			Promise.resolve(new Response(JSON.stringify([{ id: "other" }]), { status: 200 })),
		);
		const r = await fetchDiscordGuildMembership("token", "123");
		expect(r).toMatchObject({ isMember: false });
	});

	it("レスポンス NG → null", async () => {
		stubFetch(() => Promise.resolve(new Response("err", { status: 401 })));
		expect(await fetchDiscordGuildMembership("token", "123")).toBeNull();
	});

	it("例外 → null", async () => {
		stubFetch(() => {
			throw new Error("network");
		});
		expect(await fetchDiscordGuildMembership("token", "123")).toBeNull();
	});
});
