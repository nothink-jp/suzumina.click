import { describe, expect, it } from "vitest";
import type { GuildMembership } from "../../entities/user";
import { isValidGuildMember, SUZUMINA_GUILD_ID } from "../discord/guild-membership";

const membership = (over: Partial<GuildMembership>): GuildMembership => ({
	guildId: SUZUMINA_GUILD_ID,
	userId: "user-1",
	isMember: true,
	...over,
});

describe("isValidGuildMember", () => {
	it("対象ギルドのメンバーなら true", () => {
		expect(isValidGuildMember(membership({}))).toBe(true);
	});

	it("対象ギルドでも isMember が false なら false", () => {
		expect(isValidGuildMember(membership({ isMember: false }))).toBe(false);
	});

	it("別ギルドなら false", () => {
		expect(isValidGuildMember(membership({ guildId: "999" }))).toBe(false);
	});
});
