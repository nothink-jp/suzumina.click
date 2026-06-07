import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInAction, signOutAction } from "../actions";

vi.mock("@/lib/auth/server", () => ({
	signInWithDiscord: vi.fn(),
	signOutCurrent: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }));

const { signInWithDiscord, signOutCurrent } = vi.mocked(await import("@/lib/auth/server"));

beforeEach(() => {
	vi.clearAllMocks();
});

describe("signInAction", () => {
	it("Discord で signInWithDiscord を呼ぶ", async () => {
		signInWithDiscord.mockResolvedValue(undefined);
		await signInAction();
		expect(signInWithDiscord).toHaveBeenCalledWith("/");
	});

	it("エラーは再 throw する", async () => {
		signInWithDiscord.mockRejectedValue(new Error("auth fail"));
		await expect(signInAction()).rejects.toThrow("auth fail");
	});
});

describe("signOutAction", () => {
	it("signOutCurrent を呼ぶ", async () => {
		signOutCurrent.mockResolvedValue(undefined);
		await signOutAction();
		expect(signOutCurrent).toHaveBeenCalledWith("/");
	});

	it("エラーは再 throw する", async () => {
		signOutCurrent.mockRejectedValue(new Error("signout fail"));
		await expect(signOutAction()).rejects.toThrow("signout fail");
	});
});
