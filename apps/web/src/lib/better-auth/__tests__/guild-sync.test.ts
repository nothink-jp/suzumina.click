import type { FirestoreUserData } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { refreshGuildStatusIfNeeded } from "../guild-sync";

const { mockFindMany, mockFetchMembership, mockUpdate, mockWarn } = vi.hoisted(() => ({
	mockFindMany: vi.fn(),
	mockFetchMembership: vi.fn(),
	mockUpdate: vi.fn(),
	mockWarn: vi.fn(),
}));

vi.mock("../firestore-adapter", () => ({ firestoreOps: () => ({ findMany: mockFindMany }) }));
vi.mock("../discord-guild", () => ({ fetchDiscordGuildMembership: mockFetchMembership }));
vi.mock("@/lib/firestore", () => ({
	getFirestore: () => ({ collection: () => ({ doc: () => ({ update: mockUpdate }) }) }),
}));
vi.mock("@/lib/logger", () => ({ warn: mockWarn, error: vi.fn(), info: vi.fn() }));

// 2026-06-01 12:00 JST
const NOW = new Date("2026-06-01T03:00:00.000Z");
const SKIP_MESSAGE = "better-auth: guild 同期をスキップ（前回値を維持）";

function makeUser(overrides: Partial<FirestoreUserData> = {}): FirestoreUserData {
	const iso = "2026-05-01T00:00:00.000Z";
	return {
		discordId: "123",
		username: "alice",
		globalName: "Alice",
		guildMembership: { guildId: "g", userId: "123", isMember: true },
		displayName: "Alice",
		isActive: true,
		flags: { isFamilyMember: true, lastGuildCheckDate: "2026-05-31" },
		dailyButtonLimit: { date: "2026-05-31", count: 3, limit: 110, guildChecked: true },
		createdAt: iso,
		updatedAt: iso,
		lastLoginAt: iso,
		isPublicProfile: true,
		showStatistics: true,
		...overrides,
	};
}

const discordAccount = { providerId: "discord", accessToken: "token" };

describe("refreshGuildStatusIfNeeded", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		// guild-sync は NODE_ENV で分岐しない。isDev 限定ログの再混入を防ぐため本番環境で検証する
		vi.stubEnv("NODE_ENV", "production");
		mockFindMany.mockResolvedValue([discordAccount]);
		mockUpdate.mockResolvedValue(undefined);
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllEnvs();
	});

	it("当日チェック済みなら何もせずログも出さない", async () => {
		const user = makeUser({ flags: { isFamilyMember: true, lastGuildCheckDate: "2026-06-01" } });
		expect(await refreshGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockFindMany).not.toHaveBeenCalled();
		expect(mockWarn).not.toHaveBeenCalled();
	});

	it("成功時は判定を更新して更新後の値を返し、warn は出さない", async () => {
		mockFetchMembership.mockResolvedValue({ guildId: "g", userId: "123", isMember: false });
		const result = await refreshGuildStatusIfNeeded("123", "ba-1", makeUser());
		expect(result.flags).toMatchObject({ isFamilyMember: false, lastGuildCheckDate: "2026-06-01" });
		expect(result.dailyButtonLimit).toMatchObject({ date: "2026-06-01", count: 0, limit: 10 });
		expect(mockWarn).not.toHaveBeenCalled();
	});

	it("Discord トークンが無ければ前回値のまま、本番でも warn（token_missing）", async () => {
		mockFindMany.mockResolvedValue([{ providerId: "discord" }]);
		const user = makeUser();
		expect(await refreshGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockWarn).toHaveBeenCalledWith(SKIP_MESSAGE, {
			reason: "token_missing",
			discordId: "123",
		});
	});

	it("トークン失効済みなら Discord API を呼ばず、warn（token_expired）", async () => {
		mockFindMany.mockResolvedValue([
			{ ...discordAccount, accessTokenExpiresAt: new Date("2026-05-31T00:00:00.000Z") },
		]);
		const user = makeUser();
		expect(await refreshGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockFetchMembership).not.toHaveBeenCalled();
		expect(mockWarn).toHaveBeenCalledWith(SKIP_MESSAGE, {
			reason: "token_expired",
			discordId: "123",
		});
	});

	it("失効前のトークンなら Discord API を呼ぶ", async () => {
		mockFindMany.mockResolvedValue([
			{ ...discordAccount, accessTokenExpiresAt: new Date("2026-06-02T00:00:00.000Z") },
		]);
		mockFetchMembership.mockResolvedValue({ guildId: "g", userId: "123", isMember: true });
		await refreshGuildStatusIfNeeded("123", "ba-1", makeUser());
		expect(mockFetchMembership).toHaveBeenCalledWith("token", "123");
		expect(mockWarn).not.toHaveBeenCalled();
	});

	it("Discord API 失敗（null）は判定を更新せず、本番でも warn（membership_fetch_failed）", async () => {
		mockFetchMembership.mockResolvedValue(null);
		const user = makeUser();
		expect(await refreshGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockUpdate).not.toHaveBeenCalled();
		expect(mockWarn).toHaveBeenCalledWith(SKIP_MESSAGE, {
			reason: "membership_fetch_failed",
			discordId: "123",
		});
	});

	it("トークン取得の例外は throw せず、本番でも warn（sync_failed・error 付き）", async () => {
		const err = new Error("UNAVAILABLE");
		mockFindMany.mockRejectedValue(err);
		const user = makeUser();
		expect(await refreshGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockWarn).toHaveBeenCalledWith(SKIP_MESSAGE, {
			reason: "sync_failed",
			discordId: "123",
			error: err,
		});
	});

	it("users の update 失敗も throw せず、本番でも warn（sync_failed）", async () => {
		mockFetchMembership.mockResolvedValue({ guildId: "g", userId: "123", isMember: true });
		const err = new Error("PERMISSION_DENIED");
		mockUpdate.mockRejectedValue(err);
		const user = makeUser();
		expect(await refreshGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockWarn).toHaveBeenCalledWith(SKIP_MESSAGE, {
			reason: "sync_failed",
			discordId: "123",
			error: err,
		});
	});
});
