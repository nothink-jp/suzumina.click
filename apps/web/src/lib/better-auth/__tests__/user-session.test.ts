import type { FirestoreUserData, GuildMembership } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { buildUserSessionFromFirestore } from "../user-session";

const iso = "2026-06-01T00:00:00.000Z";

function makeUser(overrides: Partial<FirestoreUserData> = {}): FirestoreUserData {
	return {
		discordId: "123",
		username: "alice",
		globalName: "Alice",
		avatar: "avatarhash",
		guildMembership: { guildId: "g", userId: "123", isMember: true },
		displayName: "Alice",
		isActive: true,
		flags: { isFamilyMember: true, lastGuildCheckDate: "2026-06-01" },
		dailyButtonLimit: { date: "2026-06-01", count: 0, limit: 10, guildChecked: true },
		createdAt: iso,
		updatedAt: iso,
		lastLoginAt: iso,
		isPublicProfile: true,
		showStatistics: true,
		...overrides,
	};
}

describe("buildUserSessionFromFirestore", () => {
	it("FirestoreUserData から UserSession を構築する", () => {
		const s = buildUserSessionFromFirestore(makeUser());
		expect(s).toMatchObject({
			discordId: "123",
			username: "alice",
			displayName: "Alice",
			isActive: true,
			isFamilyMember: true,
		});
	});

	it("avatar が null/空なら undefined になる", () => {
		expect(buildUserSessionFromFirestore(makeUser({ avatar: null })).avatar).toBeUndefined();
	});

	it("flags 無しなら isFamilyMember は false", () => {
		expect(buildUserSessionFromFirestore(makeUser({ flags: undefined })).isFamilyMember).toBe(false);
	});

	it("isActive=false を保持する（Phase 2 のゲートで使用）", () => {
		expect(buildUserSessionFromFirestore(makeUser({ isActive: false })).isActive).toBe(false);
	});

	it("guildMembership 引数をそのまま載せる", () => {
		const gm: GuildMembership = { guildId: "g", userId: "123", isMember: true, roles: ["x"] };
		expect(buildUserSessionFromFirestore(makeUser(), gm).guildMembership).toEqual(gm);
	});
});
