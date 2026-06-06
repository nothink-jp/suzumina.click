import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInAction, signOutAction } from "../actions";

vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/logger", () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }));

const { signIn, signOut } = vi.mocked(await import("@/auth"));

beforeEach(() => {
	vi.clearAllMocks();
});

describe("signInAction", () => {
	it("Discord で signIn を呼ぶ", async () => {
		signIn.mockResolvedValue(undefined as never);
		await signInAction();
		expect(signIn).toHaveBeenCalledWith("discord", { redirectTo: "/" });
	});

	it("エラーは再 throw する", async () => {
		signIn.mockRejectedValue(new Error("auth fail"));
		await expect(signInAction()).rejects.toThrow("auth fail");
	});
});

describe("signOutAction", () => {
	it("signOut を呼ぶ", async () => {
		signOut.mockResolvedValue(undefined as never);
		await signOutAction();
		expect(signOut).toHaveBeenCalledWith({ redirectTo: "/" });
	});

	it("エラーは再 throw する", async () => {
		signOut.mockRejectedValue(new Error("signout fail"));
		await expect(signOutAction()).rejects.toThrow("signout fail");
	});
});
