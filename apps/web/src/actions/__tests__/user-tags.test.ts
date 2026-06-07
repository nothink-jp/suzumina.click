import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateUserTagsAction } from "../user-tags";

vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/video-firestore", () => ({ updateVideoUserTags: vi.fn() }));

const getCurrentUser = vi.mocked(await import("@/lib/auth/server")).getCurrentUser;
const { updateVideoUserTags } = vi.mocked(await import("@/lib/video-firestore"));

const login = () => getCurrentUser.mockResolvedValue({ discordId: "u1" } as never);

beforeEach(() => {
	vi.clearAllMocks();
	login();
});

describe("updateUserTagsAction: 検証分岐", () => {
	it("未ログインはエラー", async () => {
		getCurrentUser.mockResolvedValue(null as never);
		expect(await updateUserTagsAction({ videoId: "v", userTags: [] })).toEqual({
			success: false,
			error: "ログインが必要です",
		});
	});

	it("videoId 必須", async () => {
		expect((await updateUserTagsAction({ videoId: "", userTags: [] })).error).toBe(
			"動画IDが必要です",
		);
	});

	it("タグは最大10個", async () => {
		const tags = Array.from({ length: 11 }, (_, i) => `t${i}`);
		expect((await updateUserTagsAction({ videoId: "v", userTags: tags })).error).toContain(
			"最大10個",
		);
	});

	it("空タグは不可", async () => {
		expect((await updateUserTagsAction({ videoId: "v", userTags: [""] })).error).toContain(
			"空のタグ",
		);
	});

	it("30文字超は不可", async () => {
		expect(
			(await updateUserTagsAction({ videoId: "v", userTags: ["a".repeat(31)] })).error,
		).toContain("30文字以内");
	});

	it("重複タグは不可", async () => {
		expect((await updateUserTagsAction({ videoId: "v", userTags: ["x", "x"] })).error).toContain(
			"重複",
		);
	});
});

describe("updateUserTagsAction: Firestore 連携", () => {
	it("成功時は userTags を返す", async () => {
		updateVideoUserTags.mockResolvedValue({ success: true, userTags: ["a"] } as never);
		expect(await updateUserTagsAction({ videoId: "v", userTags: ["a"] })).toEqual({
			success: true,
			userTags: ["a"],
		});
		expect(updateVideoUserTags).toHaveBeenCalledWith("v", ["a"]);
	});

	it("失敗時は error（既定文言フォールバック）", async () => {
		updateVideoUserTags.mockResolvedValue({ success: false } as never);
		expect((await updateUserTagsAction({ videoId: "v", userTags: ["a"] })).error).toBe(
			"ユーザータグの更新に失敗しました",
		);
	});

	it("失敗時は result.error を優先", async () => {
		updateVideoUserTags.mockResolvedValue({ success: false, error: "固有エラー" } as never);
		expect((await updateUserTagsAction({ videoId: "v", userTags: ["a"] })).error).toBe(
			"固有エラー",
		);
	});

	it("例外は catch する", async () => {
		updateVideoUserTags.mockRejectedValue(new Error("boom"));
		expect((await updateUserTagsAction({ videoId: "v", userTags: ["a"] })).error).toBe("boom");
	});
});
