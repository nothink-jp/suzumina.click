import { SUZUMINA_GUILD_ID } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAppUserOnFirstSignup } from "../on-first-signup";

const { mockUserExists, mockCreateUser, mockFindOne, mockFetchMembership, mockWarn } = vi.hoisted(
	() => ({
		mockUserExists: vi.fn(),
		mockCreateUser: vi.fn(),
		mockFindOne: vi.fn(),
		mockFetchMembership: vi.fn(),
		mockWarn: vi.fn(),
	}),
);

vi.mock("@/lib/user-firestore", () => ({
	userExists: mockUserExists,
	createUser: mockCreateUser,
}));
vi.mock("../firestore-adapter", () => ({ firestoreOps: () => ({ findOne: mockFindOne }) }));
vi.mock("../discord-guild", () => ({
	extractAvatarHash: () => null,
	fetchDiscordGuildMembership: mockFetchMembership,
}));
vi.mock("@/lib/logger", () => ({ warn: mockWarn, error: vi.fn(), info: vi.fn() }));

const account = { providerId: "discord", accessToken: "token", accountId: "123", userId: "ba-1" };

describe("createAppUserOnFirstSignup の guild 取得", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUserExists.mockResolvedValue(false);
		mockFindOne.mockResolvedValue({ name: "alice" });
		mockCreateUser.mockResolvedValue(undefined);
	});

	it("取得成功ならその membership で作成し、warn は出さない", async () => {
		const membership = { guildId: SUZUMINA_GUILD_ID, userId: "123", isMember: true };
		mockFetchMembership.mockResolvedValue({ ok: true, membership });
		await createAppUserOnFirstSignup(account);
		expect(mockCreateUser).toHaveBeenCalledWith(
			expect.objectContaining({ guildMembership: membership }),
		);
		expect(mockWarn).not.toHaveBeenCalled();
	});

	it("取得失敗でも作成は止めず非メンバーで作り、status 付きで warn を出す", async () => {
		mockFetchMembership.mockResolvedValue({ ok: false, status: 503 });
		await createAppUserOnFirstSignup(account);
		expect(mockCreateUser).toHaveBeenCalledWith(
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
