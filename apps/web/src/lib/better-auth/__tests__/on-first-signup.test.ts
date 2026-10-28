import { SUZUMINA_GUILD_ID } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAppUserOnFirstSignup } from "../on-first-signup";

const { mockCreateUserIfAbsent, mockFindOne, mockFetchMembership, mockWarn, mockLogError } =
	vi.hoisted(() => ({
		mockCreateUserIfAbsent: vi.fn(),
		mockLogError: vi.fn(),
		mockFindOne: vi.fn(),
		mockFetchMembership: vi.fn(),
		mockWarn: vi.fn(),
	}));

vi.mock("@/lib/user-firestore", () => ({
	createUserIfAbsent: mockCreateUserIfAbsent,
}));
vi.mock("../firestore-adapter", () => ({ firestoreOps: () => ({ findOne: mockFindOne }) }));
vi.mock("../discord-guild", () => ({
	extractAvatarHash: () => null,
	fetchDiscordGuildMembership: mockFetchMembership,
}));
vi.mock("@/lib/logger", () => ({ warn: mockWarn, error: mockLogError, info: vi.fn() }));

const account = { providerId: "discord", accessToken: "token", accountId: "123", userId: "ba-1" };

describe("createAppUserOnFirstSignup の guild 取得", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFindOne.mockResolvedValue({ name: "alice" });
		mockCreateUserIfAbsent.mockResolvedValue({ created: true });
	});

	it("取得成功ならその membership で作成し、warn は出さない", async () => {
		const membership = { guildId: SUZUMINA_GUILD_ID, userId: "123", isMember: true };
		mockFetchMembership.mockResolvedValue({ ok: true, membership });
		await createAppUserOnFirstSignup(account);
		expect(mockCreateUserIfAbsent).toHaveBeenCalledWith(
			expect.objectContaining({ guildMembership: membership }),
		);
		expect(mockWarn).not.toHaveBeenCalled();
	});

	it("取得失敗でも作成は止めず非メンバーで作り、status 付きで warn を出す", async () => {
		mockFetchMembership.mockResolvedValue({ ok: false, status: 503 });
		await createAppUserOnFirstSignup(account);
		expect(mockCreateUserIfAbsent).toHaveBeenCalledWith(
			expect.objectContaining({
				guildMembership: { guildId: SUZUMINA_GUILD_ID, userId: "123", isMember: false },
			}),
		);
		expect(mockWarn).toHaveBeenCalledWith(
			"better-auth: 初回サインアップの guild 取得失敗（非メンバーとして作成）",
			{ discordId: "123", status: 503 },
		);
	});
});

describe("createAppUserOnFirstSignup の既存ユーザー保護（SPR-396）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFindOne.mockResolvedValue({ name: "alice" });
		mockFetchMembership.mockResolvedValue({ ok: false, status: 503 });
	});

	it("事前の存在確認（読み取り）に頼らず createUserIfAbsent に任せる", async () => {
		mockCreateUserIfAbsent.mockResolvedValue({ created: false });
		await createAppUserOnFirstSignup(account);
		expect(mockCreateUserIfAbsent).toHaveBeenCalledTimes(1);
		// 既存ユーザー（created: false）は正常系。エラーログは出さない
		expect(mockLogError).not.toHaveBeenCalled();
	});

	it("既存ユーザーなら guild 取得に失敗していても「非メンバーとして作成」の warn を出さない", async () => {
		mockCreateUserIfAbsent.mockResolvedValue({ created: false });
		await createAppUserOnFirstSignup(account);
		expect(mockWarn).not.toHaveBeenCalled();
	});

	it("作成が失敗したら throw せずエラーログを残す（サインアップは止めない）", async () => {
		const err = new Error("ユーザー作成に失敗しました");
		mockCreateUserIfAbsent.mockRejectedValue(err);
		await expect(createAppUserOnFirstSignup(account)).resolves.toBeUndefined();
		expect(mockLogError).toHaveBeenCalledWith("better-auth: app user 作成失敗", {
			discordId: "123",
			err,
		});
	});
});
