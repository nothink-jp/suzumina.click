import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: mockGetCurrentUser }));

const mockGenerateClipContent = vi.fn();
vi.mock("@/lib/gemini/client", () => ({ generateClipContent: mockGenerateClipContent }));

vi.mock("@/lib/logger", () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

const mockGetFirestore = vi.fn();
vi.mock("@/lib/firestore", () => ({ getFirestore: mockGetFirestore }));

const { getVideoTranscriptChunk } = await import("../video-transcription");

const VALID_INPUT = { videoId: "97UnRtIlMc0", chunkIndex: 1 };

const GEMINI_TEXT = JSON.stringify({
	utterances: [
		{ start: 1.5, end: 3.5, text: "こんにちは" },
		{ start: 5.0, end: 7.0, text: "今日はゲームやるよ" },
	],
});

function setupFirestore({
	cachedChunk = null,
	videoDuration = "PT2H23M59S",
	videoExists = true,
}: {
	cachedChunk?: Record<string, unknown> | null;
	videoDuration?: string;
	videoExists?: boolean;
} = {}) {
	const mockSet = vi.fn(async (_doc: Record<string, unknown>) => undefined);
	const chunkDoc = {
		get: vi.fn(async () => ({
			exists: cachedChunk !== null,
			data: () => cachedChunk,
		})),
		set: mockSet,
	};
	const videoDocRef = {
		get: vi.fn(async () => ({
			exists: videoExists,
			data: () => ({ duration: videoDuration }),
		})),
		collection: vi.fn(() => ({ doc: vi.fn(() => chunkDoc) })),
	};
	mockGetFirestore.mockReturnValue({
		collection: vi.fn(() => ({ doc: vi.fn(() => videoDocRef) })),
	});
	return { mockSet, chunkDoc, videoDocRef };
}

describe("getVideoTranscriptChunk (SPR-292)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCurrentUser.mockResolvedValue({ discordId: "u1", isActive: true });
		mockGenerateClipContent.mockResolvedValue({ success: true, text: GEMINI_TEXT });
	});

	it("未ログインは生成せず失敗を返す（認可ゲート正本 = getCurrentUser null チェック）", async () => {
		setupFirestore();
		mockGetCurrentUser.mockResolvedValue(null);

		const result = await getVideoTranscriptChunk(VALID_INPUT);

		expect(result).toEqual({ success: false, error: "ログインが必要です" });
		expect(mockGenerateClipContent).not.toHaveBeenCalled();
	});

	it("無効ユーザー（isActive=false）はブロックする（外部APIコストが発生するため）", async () => {
		setupFirestore();
		mockGetCurrentUser.mockResolvedValue({ discordId: "u1", isActive: false });

		const result = await getVideoTranscriptChunk(VALID_INPUT);

		expect(result.success).toBe(false);
		expect(mockGenerateClipContent).not.toHaveBeenCalled();
	});

	it("不正な videoId・チャンク番号は弾く", async () => {
		setupFirestore();

		expect((await getVideoTranscriptChunk({ videoId: "bad id!", chunkIndex: 0 })).success).toBe(
			false,
		);
		expect(
			(await getVideoTranscriptChunk({ videoId: "97UnRtIlMc0", chunkIndex: -1 })).success,
		).toBe(false);
		expect(
			(await getVideoTranscriptChunk({ videoId: "97UnRtIlMc0", chunkIndex: 1.5 })).success,
		).toBe(false);
		expect(mockGenerateClipContent).not.toHaveBeenCalled();
	});

	it("キャッシュがあれば Gemini を呼ばずに返す", async () => {
		setupFirestore({
			cachedChunk: {
				chunkIndex: 1,
				utterances: [{ start: 601, end: 603, text: "キャッシュ済み" }],
			},
		});

		const result = await getVideoTranscriptChunk(VALID_INPUT);

		expect(result).toEqual({
			success: true,
			data: { chunkIndex: 1, utterances: [{ start: 601, end: 603, text: "キャッシュ済み" }] },
		});
		expect(mockGenerateClipContent).not.toHaveBeenCalled();
	});

	it("キャッシュが無ければ生成して保存する（オーバーラップ窓・SPR-291 の生成パラメータ）", async () => {
		const { mockSet } = setupFirestore();

		const result = await getVideoTranscriptChunk(VALID_INPUT);

		expect(result.success).toBe(true);
		if (result.success) {
			// 相対時刻 1.5s → チャンク1（600s〜）の絶対時刻 601.5s
			expect(result.data.utterances[0]).toEqual({ start: 601.5, end: 603.5, text: "こんにちは" });
		}
		const call = mockGenerateClipContent.mock.calls[0]?.[0];
		expect(call.startOffsetSeconds).toBe(600);
		expect(call.endOffsetSeconds).toBe(1215);
		expect(call.options).toEqual({
			timeoutMs: 120_000,
			maxOutputTokens: 16_384,
			thinkingBudget: 1_024,
		});
		expect(mockSet).toHaveBeenCalledOnce();
		const written = mockSet.mock.calls[0]?.[0] as Record<string, unknown>;
		expect(written.chunkIndex).toBe(1);
		// Firestore は Date を Timestamp として保存する（新規コレクションの日時規約）
		expect(written.createdAt).toBeInstanceOf(Date);
	});

	it("動画が存在しない・動画長を超えるチャンクは弾く", async () => {
		setupFirestore({ videoExists: false });
		expect((await getVideoTranscriptChunk(VALID_INPUT)).success).toBe(false);

		setupFirestore({ videoDuration: "PT5M" });
		expect((await getVideoTranscriptChunk({ videoId: "97UnRtIlMc0", chunkIndex: 1 })).success).toBe(
			false,
		);
		expect(mockGenerateClipContent).not.toHaveBeenCalled();
	});

	it("Gemini 失敗・解釈不能応答は失敗を返す（保存しない）", async () => {
		const { mockSet } = setupFirestore();
		mockGenerateClipContent.mockResolvedValue({ success: false, error: "err" });
		expect((await getVideoTranscriptChunk(VALID_INPUT)).success).toBe(false);

		mockGenerateClipContent.mockResolvedValue({ success: true, text: "not json" });
		expect((await getVideoTranscriptChunk(VALID_INPUT)).success).toBe(false);
		expect(mockSet).not.toHaveBeenCalled();
	});
});
