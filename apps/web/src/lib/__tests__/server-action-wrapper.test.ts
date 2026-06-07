import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	withAuthenticatedAction,
	withErrorHandling,
	withValidation,
} from "../server-action-wrapper";

vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/logger", () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }));

const getCurrentUser = vi.mocked(await import("@/lib/auth/server")).getCurrentUser;
const opts = { action: "testAction", errorMessage: "失敗しました" };

beforeEach(() => {
	vi.clearAllMocks();
});

describe("withErrorHandling", () => {
	it("成功時は { success:true, data }", async () => {
		const r = await withErrorHandling(async () => 42, opts);
		expect(r).toEqual({ success: true, data: 42 });
	});

	it("Error throw 時はそのメッセージを返す", async () => {
		const r = await withErrorHandling(async () => {
			throw new Error("具体的エラー");
		}, opts);
		expect(r).toEqual({ success: false, error: "具体的エラー" });
	});

	it("非 Error throw 時は既定メッセージ", async () => {
		const r = await withErrorHandling(async () => {
			throw "文字列エラー";
		}, opts);
		expect(r).toEqual({ success: false, error: "失敗しました" });
	});
});

describe("withAuthenticatedAction", () => {
	it("未認証は authErrorMessage（既定文言）", async () => {
		getCurrentUser.mockResolvedValue(null as never);
		const r = await withAuthenticatedAction(async () => "x", opts);
		expect(r).toEqual({ success: false, error: "ログインが必要です" });
	});

	it("authErrorMessage 指定時はそれを使う", async () => {
		getCurrentUser.mockResolvedValue(null as never);
		const r = await withAuthenticatedAction(async () => "x", {
			...opts,
			authErrorMessage: "要ログイン",
		});
		expect(r.success).toBe(false);
		if (!r.success) expect(r.error).toBe("要ログイン");
	});

	it("認証済みは user を渡して実行", async () => {
		getCurrentUser.mockResolvedValue({ discordId: "u1" } as never);
		const r = await withAuthenticatedAction(async (user) => `hi ${user.discordId}`, opts);
		expect(r).toEqual({ success: true, data: "hi u1" });
	});

	it("本処理の例外は catch する", async () => {
		getCurrentUser.mockResolvedValue({ discordId: "u1" } as never);
		const r = await withAuthenticatedAction(async () => {
			throw new Error("boom");
		}, opts);
		expect(r).toEqual({ success: false, error: "boom" });
	});
});

describe("withValidation", () => {
	it("バリデーション失敗時はそのエラーを返し fn を呼ばない", async () => {
		const fn = vi.fn();
		const r = await withValidation("bad", () => "入力エラー", fn, opts);
		expect(r).toEqual({ success: false, error: "入力エラー" });
		expect(fn).not.toHaveBeenCalled();
	});

	it("バリデーション成功時は fn を実行（withErrorHandling 経由）", async () => {
		const r = await withValidation(
			"ok",
			() => null,
			async (input) => `processed:${input}`,
			opts,
		);
		expect(r).toEqual({ success: true, data: "processed:ok" });
	});

	it("成功後の fn 例外は withErrorHandling が捕捉", async () => {
		const r = await withValidation(
			"ok",
			() => null,
			async () => {
				throw new Error("fn fail");
			},
			opts,
		);
		expect(r).toEqual({ success: false, error: "fn fail" });
	});
});
