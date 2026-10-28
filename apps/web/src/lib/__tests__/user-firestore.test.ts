import type { FirestoreUserData } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	convertToFrontendUser,
	createUser,
	getUserByDiscordId,
	updateLastLogin,
} from "../user-firestore";

const { mockGet, mockUpdate, mockWarn, mockLogError } = vi.hoisted(() => ({
	mockGet: vi.fn(),
	mockUpdate: vi.fn(),
	mockWarn: vi.fn(),
	mockLogError: vi.fn(),
}));

vi.mock("../firestore", () => ({
	getFirestore: () => ({
		collection: () => ({ doc: () => ({ get: mockGet, update: mockUpdate }) }),
	}),
}));
vi.mock("../logger", () => ({ warn: mockWarn, error: mockLogError }));

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

describe("失敗の観測（本番でも無音にしない）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("NODE_ENV", "production");
	});
	afterEach(() => vi.unstubAllEnvs());

	it("updateLastLogin の書き込み失敗は throw せず warn を出す", async () => {
		const err = new Error("UNAVAILABLE");
		mockUpdate.mockRejectedValue(err);
		await expect(updateLastLogin("123")).resolves.toBeUndefined();
		expect(mockWarn).toHaveBeenCalledWith("updateLastLogin 失敗", { discordId: "123", error: err });
	});

	it("getUserByDiscordId の読み取り失敗は元のエラーを残してから汎用エラーで投げる", async () => {
		const err = new Error("UNAVAILABLE");
		mockGet.mockRejectedValue(err);
		await expect(getUserByDiscordId("123")).rejects.toThrow("ユーザー情報の取得に失敗しました");
		expect(mockLogError).toHaveBeenCalledWith("getUserByDiscordId error:", {
			discordId: "123",
			error: err,
		});
	});
});

describe("convertToFrontendUser のスキーマ不一致", () => {
	it("ZodError を cause に残して投げる（ログで不一致フィールドを追えるように）", () => {
		const broken = { discordId: "123" } as unknown as FirestoreUserData;
		let thrown: unknown;
		try {
			convertToFrontendUser(broken);
		} catch (e) {
			thrown = e;
		}
		expect(thrown).toBeInstanceOf(Error);
		expect((thrown as Error).message).toBe("ユーザーデータの形式が無効です");
		expect((thrown as Error).cause).toBeInstanceOf(Error);
	});
});

describe("createUser の失敗", () => {
	it("スキーマ検証の失敗を cause に残して投げる（初回サインアップのログで原因を追えるように）", async () => {
		const input = { discordUser: { id: "", username: "" } } as unknown as Parameters<
			typeof createUser
		>[0];
		const thrown = await createUser(input).catch((e: unknown) => e);
		expect((thrown as Error).message).toBe("ユーザー作成に失敗しました");
		expect((thrown as Error).cause).toBeInstanceOf(Error);
	});
});
