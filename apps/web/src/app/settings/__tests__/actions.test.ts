import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockCurrentUser } from "@/test-utils/auth-server";
import { updateUserProfile } from "../actions";

vi.mock("@/lib/auth/server");
vi.mock("@/lib/user-firestore", () => ({ updateUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { updateUser } = vi.mocked(await import("@/lib/user-firestore"));
const { revalidatePath } = vi.mocked(await import("next/cache"));

beforeEach(() => {
	vi.clearAllMocks();
});

describe("updateUserProfile", () => {
	it("未認証はエラー", async () => {
		mockCurrentUser(null);
		expect(await updateUserProfile({ isPublicProfile: true })).toEqual({
			success: false,
			error: "認証が必要です",
		});
		expect(updateUser).not.toHaveBeenCalled();
	});

	it("認証済みは updateUser を呼びキャッシュを再検証する", async () => {
		mockCurrentUser({ discordId: "u1" });
		updateUser.mockResolvedValue(undefined as never);
		expect(await updateUserProfile({ isPublicProfile: false })).toEqual({ success: true });
		expect(updateUser).toHaveBeenCalledWith({ discordId: "u1", isPublicProfile: false });
		expect(revalidatePath).toHaveBeenCalledWith("/users/u1");
		expect(revalidatePath).toHaveBeenCalledWith("/settings");
	});

	it("例外時はエラーを返す", async () => {
		mockCurrentUser({ discordId: "u1" });
		updateUser.mockRejectedValue(new Error("db down"));
		expect(await updateUserProfile({ isPublicProfile: true })).toEqual({
			success: false,
			error: "プロフィールの更新に失敗しました",
		});
	});
});
