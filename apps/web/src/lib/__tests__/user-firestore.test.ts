import type { FirestoreUserData } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convertToFrontendUser } from "../user-firestore";

vi.mock("../firestore", () => ({ getFirestore: vi.fn() }));

// 2026-06-01 22:00 JST
const NOW = new Date("2026-06-01T13:00:00.000Z");

function makeUser(lastLoginAt: string): FirestoreUserData {
	return {
		discordId: "123",
		username: "alice",
		globalName: "Alice",
		guildMembership: { guildId: "g", userId: "123", isMember: false },
		displayName: "Alice",
		isActive: true,
		createdAt: "2026-05-01T00:00:00.000Z",
		updatedAt: lastLoginAt,
		lastLoginAt,
		isPublicProfile: true,
		showStatistics: true,
	};
}

describe("convertToFrontendUser の lastActiveText", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});
	afterEach(() => vi.useRealTimers());

	it("lastLoginAt は日次更新のため、当日分は「N時間前」ではなく「今日」", () => {
		// 2026-06-01 07:00 JST（同日の朝。時間単位なら「15時間前」になる）
		expect(convertToFrontendUser(makeUser("2026-05-31T22:00:00.000Z")).lastActiveText).toBe("今日");
	});

	it("前日以前は相対表示のまま", () => {
		// 2026-05-31 22:00 JST（ちょうど 24 時間前）
		expect(convertToFrontendUser(makeUser("2026-05-31T13:00:00.000Z")).lastActiveText).toBe("昨日");
	});
});
