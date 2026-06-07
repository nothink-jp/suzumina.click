import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateUserProfile } from "../actions";

vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/user-firestore", () => ({ updateUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getCurrentUser = vi.mocked(await import("@/lib/auth/server")).getCurrentUser;
const { updateUser } = vi.mocked(await import("@/lib/user-firestore"));
const { revalidatePath } = vi.mocked(await import("next/cache"));

beforeEach(() => {
	vi.clearAllMocks();
});

describe("updateUserProfile", () => {
	it("未認証はエラー", async () => {
		getCurrentUser.mockResolvedValue(null);
		expect(await updateUserProfile({ isPublicProfile: true })).toEqual({
			success: false,
			error: "認証が必要です",
		});
		expect(updateUser).not.toHaveBeenCalled();
	});

	it("認証済みは updateUser を呼びキャッシュを再検証する", async () => {
		getCurrentUser.mockResolvedValue({ discordId: "u1" } as never);
		updateUser.mockResolvedValue(undefined as never);
		expect(await updateUserProfile({ isPublicProfile: false })).toEqual({ success: true });
		expect(updateUser).toHaveBeenCalledWith({ discordId: "u1", isPublicProfile: false });
		expect(revalidatePath).toHaveBeenCalledWith("/users/u1");
		expect(revalidatePath).toHaveBeenCalledWith("/settings");
	});

	it("例外時はエラーを返す", async () => {
		getCurrentUser.mockResolvedValue({ discordId: "u1" } as never);
		updateUser.mockRejectedValue(new Error("db down"));
		expect(await updateUserProfile({ isPublicProfile: true })).toEqual({
			success: false,
			error: "プロフィールの更新に失敗しました",
		});
	});
});
