import { beforeEach, describe, expect, it, vi } from "vitest";
import { consumeGeminiQuota } from "../gemini-rate-limit";

const mockTxGet = vi.fn();
const mockTxUpdate = vi.fn();

vi.mock("@/lib/firestore", () => ({
	getFirestore: () => ({
		collection: () => ({ doc: () => ({ id: "users/u1" }) }),
		runTransaction: async (fn: (tx: unknown) => unknown) =>
			fn({ get: mockTxGet, update: mockTxUpdate }),
	}),
}));

vi.mock("@/lib/jst-date", () => ({ getJSTDateString: vi.fn(() => "2026-10-28") }));

function userDoc(data: Record<string, unknown> | undefined) {
	mockTxGet.mockResolvedValue({ exists: data !== undefined, data: () => data });
}

describe("consumeGeminiQuota (SPR-336)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("初回（カウンタ無し）は今日の日付で作って 1 にする", async () => {
		userDoc({});

		const result = await consumeGeminiQuota("u1", "suggestion");

		expect(result).toEqual({ allowed: true });
		expect(mockTxUpdate).toHaveBeenCalledWith(expect.anything(), {
			dailyGeminiUsage: { date: "2026-10-28", transcription: 0, suggestion: 1 },
		});
	});

	it("同日で上限未満なら該当種別だけ加算する", async () => {
		userDoc({ dailyGeminiUsage: { date: "2026-10-28", transcription: 2, suggestion: 5 } });

		const result = await consumeGeminiQuota("u1", "transcription");

		expect(result).toEqual({ allowed: true });
		expect(mockTxUpdate).toHaveBeenCalledWith(expect.anything(), {
			"dailyGeminiUsage.transcription": 3,
		});
	});

	it("同日で上限に達していたら拒否し、カウンタを更新しない", async () => {
		userDoc({ dailyGeminiUsage: { date: "2026-10-28", transcription: 6, suggestion: 0 } });

		const result = await consumeGeminiQuota("u1", "transcription");

		expect(result.allowed).toBe(false);
		expect(result.allowed === false && result.error).toContain("上限（6回）");
		expect(mockTxUpdate).not.toHaveBeenCalled();
	});

	it("ファミリーメンバーはボーナス分まで許可する", async () => {
		userDoc({
			flags: { isFamilyMember: true },
			dailyGeminiUsage: { date: "2026-10-28", transcription: 6, suggestion: 0 },
		});

		const result = await consumeGeminiQuota("u1", "transcription");

		expect(result).toEqual({ allowed: true });
	});

	it("前日のカウンタは上限でもリセットして許可する", async () => {
		userDoc({ dailyGeminiUsage: { date: "2026-10-27", transcription: 6, suggestion: 30 } });

		const result = await consumeGeminiQuota("u1", "suggestion");

		expect(result).toEqual({ allowed: true });
		expect(mockTxUpdate).toHaveBeenCalledWith(expect.anything(), {
			dailyGeminiUsage: { date: "2026-10-28", transcription: 0, suggestion: 1 },
		});
	});

	it("users ドキュメントが無ければ拒否する", async () => {
		userDoc(undefined);

		const result = await consumeGeminiQuota("u1", "suggestion");

		expect(result.allowed).toBe(false);
		expect(mockTxUpdate).not.toHaveBeenCalled();
	});
});
