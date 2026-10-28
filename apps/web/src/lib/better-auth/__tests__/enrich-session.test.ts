import type { FirestoreUserData } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAppUserForSession, shouldUpdateLastLogin } from "../enrich-session";

const { mockGet, mockUpdateLastLogin, mockWarn } = vi.hoisted(() => ({
	mockGet: vi.fn(),
	mockUpdateLastLogin: vi.fn(),
	mockWarn: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
	getFirestore: () => ({ collection: () => ({ doc: () => ({ get: mockGet }) }) }),
}));
vi.mock("@/lib/user-firestore", () => ({ updateLastLogin: mockUpdateLastLogin }));
vi.mock("@/lib/logger", () => ({ warn: mockWarn, error: vi.fn(), info: vi.fn() }));
// guild 同期はこのテストの対象外（受け取った userData をそのまま返す）
vi.mock("../guild-sync", () => ({
	refreshGuildStatusIfNeeded: vi.fn(
		async (_d: string, _u: string, data: FirestoreUserData) => data,
	),
}));

// 2026-06-01 12:00 JST
const NOW = new Date("2026-06-01T03:00:00.000Z");

function makeUser(overrides: Partial<FirestoreUserData> = {}): FirestoreUserData {
	const iso = "2026-05-01T00:00:00.000Z";
	return {
		discordId: "123",
		username: "alice",
		globalName: "Alice",
		guildMembership: { guildId: "g", userId: "123", isMember: false },
		displayName: "Alice",
		isActive: true,
		flags: { isFamilyMember: false, lastGuildCheckDate: "2026-06-01" },
		createdAt: iso,
		updatedAt: iso,
		lastLoginAt: iso,
		isPublicProfile: true,
		showStatistics: true,
		...overrides,
	};
}

function mockUserDoc(data: FirestoreUserData) {
	mockGet.mockResolvedValue({ exists: true, data: () => data });
}

const authUser = { id: "ba-1", discordId: "123" };

describe("shouldUpdateLastLogin", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});
	afterEach(() => vi.useRealTimers());

	it("JST で同日なら false", () => {
		// 2026-06-01 00:30 JST
		expect(shouldUpdateLastLogin("2026-05-31T15:30:00.000Z")).toBe(false);
	});

	it("UTC では同日でも JST で前日なら true", () => {
		// 2026-05-31 23:59 JST（UTC では 06-01 と同じ日付ではないが、JST 境界で判定する）
		expect(shouldUpdateLastLogin("2026-05-31T14:59:00.000Z")).toBe(true);
	});

	it("欠落・不正値は true", () => {
		expect(shouldUpdateLastLogin(undefined)).toBe(true);
		expect(shouldUpdateLastLogin("not-a-date")).toBe(true);
	});
});

describe("buildAppUserForSession", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		mockUpdateLastLogin.mockResolvedValue(undefined);
	});
	afterEach(() => vi.useRealTimers());

	it("lastLogin の書き込みは日次 1 回（同日の再取得では書かない）", async () => {
		mockUserDoc(makeUser({ lastLoginAt: "2026-05-31T10:00:00.000Z" }));
		await buildAppUserForSession(authUser);
		expect(mockUpdateLastLogin).toHaveBeenCalledTimes(1);
		expect(mockUpdateLastLogin).toHaveBeenCalledWith("123");

		// 書き込み後の状態（今日の lastLoginAt）で同日に何度取得しても追加の write は無い
		mockUserDoc(makeUser({ lastLoginAt: NOW.toISOString() }));
		for (let i = 0; i < 5; i++) await buildAppUserForSession(authUser);
		expect(mockUpdateLastLogin).toHaveBeenCalledTimes(1);
	});

	it("isActive=false の無効ユーザーも null にせず返す（ブロックは呼び出し側）", async () => {
		mockUserDoc(makeUser({ isActive: false }));
		const result = await buildAppUserForSession(authUser);
		expect(result).toMatchObject({ discordId: "123", isActive: false });
	});

	it("discordId が無ければ Firestore を読まずに null", async () => {
		expect(await buildAppUserForSession({ id: "ba-1" })).toBeNull();
		expect(mockGet).not.toHaveBeenCalled();
	});

	it("users 未作成なら null", async () => {
		mockGet.mockResolvedValue({ exists: false });
		expect(await buildAppUserForSession(authUser)).toBeNull();
		expect(mockWarn).not.toHaveBeenCalled();
	});

	it("enrich 失敗は null を返しつつ warn を出す（本番でも無音にしない）", async () => {
		vi.stubEnv("NODE_ENV", "production");
		const err = new Error("UNAVAILABLE");
		mockGet.mockRejectedValue(err);
		expect(await buildAppUserForSession(authUser)).toBeNull();
		expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining("enrich 失敗"), {
			discordId: "123",
			error: err,
		});
		vi.unstubAllEnvs();
	});
});
