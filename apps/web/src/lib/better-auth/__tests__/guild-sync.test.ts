import type { FirestoreUserData } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncGuildStatusIfNeeded } from "../guild-sync";

const { mockFindMany, mockGetAccessToken, mockFetchMembership, mockUpdate, mockWarn } = vi.hoisted(
	() => ({
		mockFindMany: vi.fn(),
		mockGetAccessToken: vi.fn(),
		mockFetchMembership: vi.fn(),
		mockUpdate: vi.fn(),
		mockWarn: vi.fn(),
	}),
);

vi.mock("../firestore-adapter", () => ({ firestoreOps: () => ({ findMany: mockFindMany }) }));
// refresh の実体（provider 呼び出し・ba_account 書き戻し）は better-auth の責務。ここでは呼び出し契約だけを見る
vi.mock("../auth", () => ({ auth: { api: { getAccessToken: mockGetAccessToken } } }));
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

const discordAccount = { id: "acc-1", providerId: "discord" };
const validToken = {
	accessToken: "token",
	accessTokenExpiresAt: new Date("2026-06-08T00:00:00.000Z"),
};

describe("syncGuildStatusIfNeeded", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		// guild-sync は NODE_ENV で分岐しない。isDev 限定ログの再混入を防ぐため本番環境で検証する
		vi.stubEnv("NODE_ENV", "production");
		mockFindMany.mockResolvedValue([discordAccount]);
		mockGetAccessToken.mockResolvedValue(validToken);
		mockUpdate.mockResolvedValue(undefined);
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllEnvs();
	});

	it("当日チェック済みなら何もせずログも出さない", async () => {
		const user = makeUser({ flags: { isFamilyMember: true, lastGuildCheckDate: "2026-06-01" } });
		expect(await syncGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockFindMany).not.toHaveBeenCalled();
		expect(mockWarn).not.toHaveBeenCalled();
	});

	it("成功時は判定を更新して更新後の値を返し、warn は出さない", async () => {
		mockFetchMembership.mockResolvedValue({
			ok: true,
			membership: { guildId: "g", userId: "123", isMember: false },
		});
		const result = await syncGuildStatusIfNeeded("123", "ba-1", makeUser());
		expect(result.flags).toMatchObject({ isFamilyMember: false, lastGuildCheckDate: "2026-06-01" });
		expect(result.dailyButtonLimit).toMatchObject({ date: "2026-06-01", count: 0, limit: 10 });
		expect(mockWarn).not.toHaveBeenCalled();
	});

	it("better-auth の getAccessToken に Discord account を指定し、得たトークンで API を呼ぶ", async () => {
		mockFindMany.mockResolvedValue([{ id: "acc-gh", providerId: "github" }, discordAccount]);
		mockFetchMembership.mockResolvedValue({
			ok: true,
			membership: { guildId: "g", userId: "123", isMember: true },
		});
		await syncGuildStatusIfNeeded("123", "ba-1", makeUser());
		expect(mockGetAccessToken).toHaveBeenCalledWith({
			body: { accountId: "acc-1", userId: "ba-1" },
		});
		expect(mockFetchMembership).toHaveBeenCalledWith("token", "123");
		expect(mockWarn).not.toHaveBeenCalled();
	});

	it("失効していても refresh で新しいトークンが得られれば同期して判定を更新する", async () => {
		// getAccessToken は失効時に refresh し、新しい期限のトークンを返す
		mockGetAccessToken.mockResolvedValue({
			accessToken: "refreshed",
			accessTokenExpiresAt: new Date("2026-06-08T03:00:00.000Z"),
		});
		mockFetchMembership.mockResolvedValue({
			ok: true,
			membership: { guildId: "g", userId: "123", isMember: false },
		});
		const result = await syncGuildStatusIfNeeded("123", "ba-1", makeUser());
		expect(mockFetchMembership).toHaveBeenCalledWith("refreshed", "123");
		expect(result.flags).toMatchObject({ isFamilyMember: false, lastGuildCheckDate: "2026-06-01" });
		expect(mockWarn).not.toHaveBeenCalled();
	});

	it("Discord account が無ければ getAccessToken を呼ばず warn（token_missing）", async () => {
		mockFindMany.mockResolvedValue([{ id: "acc-gh", providerId: "github" }]);
		const user = makeUser();
		expect(await syncGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockGetAccessToken).not.toHaveBeenCalled();
		expect(mockWarn).toHaveBeenCalledWith(SKIP_MESSAGE, {
			reason: "token_missing",
			discordId: "123",
		});
	});

	it("アクセストークンが空なら warn（token_missing）", async () => {
		mockGetAccessToken.mockResolvedValue({ accessToken: undefined });
		const user = makeUser();
		expect(await syncGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockFetchMembership).not.toHaveBeenCalled();
		expect(mockWarn).toHaveBeenCalledWith(SKIP_MESSAGE, {
			reason: "token_missing",
			discordId: "123",
		});
	});

	it("refresh 失敗は throw せず前回値を維持し、warn（token_refresh_failed・error 付き）", async () => {
		const err = new Error("FAILED_TO_GET_ACCESS_TOKEN");
		mockGetAccessToken.mockRejectedValue(err);
		const user = makeUser();
		expect(await syncGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockFetchMembership).not.toHaveBeenCalled();
		expect(mockUpdate).not.toHaveBeenCalled();
		expect(mockWarn).toHaveBeenCalledWith(SKIP_MESSAGE, {
			reason: "token_refresh_failed",
			discordId: "123",
			error: err,
		});
	});

	it("refresh token が無く失効のまま返ったら API を呼ばず warn（token_expired）", async () => {
		mockGetAccessToken.mockResolvedValue({
			accessToken: "stale",
			accessTokenExpiresAt: new Date("2026-05-31T00:00:00.000Z"),
		});
		const user = makeUser();
		expect(await syncGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockFetchMembership).not.toHaveBeenCalled();
		expect(mockWarn).toHaveBeenCalledWith(SKIP_MESSAGE, {
			reason: "token_expired",
			discordId: "123",
		});
	});

	it("Discord API の HTTP 失敗は判定を更新せず、status 付きで warn（membership_fetch_failed）", async () => {
		mockFetchMembership.mockResolvedValue({ ok: false, status: 429 });
		const user = makeUser();
		expect(await syncGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockUpdate).not.toHaveBeenCalled();
		expect(mockWarn).toHaveBeenCalledWith(SKIP_MESSAGE, {
			reason: "membership_fetch_failed",
			discordId: "123",
			status: 429,
		});
	});

	it("Discord API の通信例外は error 付きで warn（membership_fetch_failed）", async () => {
		const err = new Error("network");
		mockFetchMembership.mockResolvedValue({ ok: false, error: err });
		const user = makeUser();
		expect(await syncGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockWarn).toHaveBeenCalledWith(SKIP_MESSAGE, {
			reason: "membership_fetch_failed",
			discordId: "123",
			error: err,
		});
	});

	it("account 検索の例外は throw せず、本番でも warn（sync_failed・error 付き）", async () => {
		const err = new Error("UNAVAILABLE");
		mockFindMany.mockRejectedValue(err);
		const user = makeUser();
		expect(await syncGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockWarn).toHaveBeenCalledWith(SKIP_MESSAGE, {
			reason: "sync_failed",
			discordId: "123",
			error: err,
		});
	});

	it("users の update 失敗も throw せず、本番でも warn（sync_failed）", async () => {
		mockFetchMembership.mockResolvedValue({
			ok: true,
			membership: { guildId: "g", userId: "123", isMember: true },
		});
		const err = new Error("PERMISSION_DENIED");
		mockUpdate.mockRejectedValue(err);
		const user = makeUser();
		expect(await syncGuildStatusIfNeeded("123", "ba-1", user)).toBe(user);
		expect(mockWarn).toHaveBeenCalledWith(SKIP_MESSAGE, {
			reason: "sync_failed",
			discordId: "123",
			error: err,
		});
	});
});
