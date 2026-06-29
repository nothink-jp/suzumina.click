import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInAction } from "../actions";

vi.mock("@/lib/auth/server");
vi.mock("@/lib/logger", () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }));

const { signInWithDiscord } = vi.mocked(await import("@/lib/auth/server"));

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
