import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInAction } from "../actions";

vi.mock("@/lib/auth/server");
vi.mock("@/lib/logger", () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }));

const { signInWithDiscord } = vi.mocked(await import("@/lib/auth/server"));

beforeEach(() => {
	vi.clearAllMocks();
});

describe("signInAction", () => {
	it("既定では / を callbackURL として signInWithDiscord を呼ぶ", async () => {
		signInWithDiscord.mockResolvedValue(undefined);
		await signInAction();
		expect(signInWithDiscord).toHaveBeenCalledWith("/");
	});

	it("渡された callbackURL（現在地）をそのまま signInWithDiscord へ渡す", async () => {
		signInWithDiscord.mockResolvedValue(undefined);
		await signInAction("/buttons/RJ123");
		expect(signInWithDiscord).toHaveBeenCalledWith("/buttons/RJ123");
	});

	it("エラーは再 throw する", async () => {
		signInWithDiscord.mockRejectedValue(new Error("auth fail"));
		await expect(signInAction()).rejects.toThrow("auth fail");
	});
});
