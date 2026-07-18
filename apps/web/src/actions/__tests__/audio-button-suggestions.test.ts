import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: mockGetCurrentUser }));

const mockGenerateClipContent = vi.fn();
vi.mock("@/lib/gemini/client", () => ({ generateClipContent: mockGenerateClipContent }));

vi.mock("@/lib/logger", () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

const { generateAudioButtonSuggestions } = await import("../audio-button-suggestions");

const VALID_INPUT = {
	videoId: "S534eutWhUY",
	startTime: 411.3,
	endTime: 414.7,
};

const GEMINI_TEXT = JSON.stringify({
	transcript: "やべ、いるわ",
	titles: ["やべ、いるわ"],
	tags: ["ゲーム"],
});

describe("generateAudioButtonSuggestions (SPR-148)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCurrentUser.mockResolvedValue({ discordId: "u1", isActive: true });
		mockGenerateClipContent.mockResolvedValue({ success: true, text: GEMINI_TEXT });
	});

	it("区間±2秒のクリップで生成し、検証済み候補を返す", async () => {
		const result = await generateAudioButtonSuggestions(VALID_INPUT);

		expect(result).toEqual({
			success: true,
			data: { transcript: "やべ、いるわ", titles: ["やべ、いるわ"], tags: ["ゲーム"] },
		});
		expect(mockGenerateClipContent).toHaveBeenCalledOnce();
		const call = mockGenerateClipContent.mock.calls[0]?.[0];
		expect(call.videoId).toBe("S534eutWhUY");
		expect(call.startOffsetSeconds).toBe(409);
		expect(call.endOffsetSeconds).toBe(417);
		expect(call.prompt).toContain("transcript");
	});

	it("未ログインは生成せず失敗を返す（認可ゲート正本 = getCurrentUser null チェック）", async () => {
		mockGetCurrentUser.mockResolvedValue(null);

		const result = await generateAudioButtonSuggestions(VALID_INPUT);

		expect(result).toEqual({ success: false, error: "ログインが必要です" });
		expect(mockGenerateClipContent).not.toHaveBeenCalled();
	});

	it("無効ユーザー（isActive=false）はブロックする（外部APIコストが発生するため）", async () => {
		mockGetCurrentUser.mockResolvedValue({ discordId: "u1", isActive: false });

		const result = await generateAudioButtonSuggestions(VALID_INPUT);

		expect(result.success).toBe(false);
		expect(mockGenerateClipContent).not.toHaveBeenCalled();
	});

	it("不正な動画ID・不正区間は生成前に弾く", async () => {
		const badVideo = await generateAudioButtonSuggestions({ ...VALID_INPUT, videoId: "bad" });
		expect(badVideo.success).toBe(false);

		const badRange = await generateAudioButtonSuggestions({
			...VALID_INPUT,
			startTime: 100,
			endTime: 90,
		});
		expect(badRange.success).toBe(false);

		const tooLong = await generateAudioButtonSuggestions({
			...VALID_INPUT,
			startTime: 0,
			endTime: 120,
		});
		expect(tooLong.success).toBe(false);

		expect(mockGenerateClipContent).not.toHaveBeenCalled();
	});

	it("Gemini呼び出し失敗はそのままエラーとして返す", async () => {
		mockGenerateClipContent.mockResolvedValue({
			success: false,
			error: "候補の生成に失敗しました",
		});

		const result = await generateAudioButtonSuggestions(VALID_INPUT);

		expect(result).toEqual({ success: false, error: "候補の生成に失敗しました" });
	});

	it("応答が候補として解釈できない場合はリトライを促すエラー", async () => {
		mockGenerateClipContent.mockResolvedValue({ success: true, text: "not-json" });

		const result = await generateAudioButtonSuggestions(VALID_INPUT);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain("もう一度");
		}
	});
});
