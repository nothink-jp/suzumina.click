import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerate = vi.fn();
vi.mock("../gemini-client", () => ({
	generateTranscriptionContent: (input: unknown) => mockGenerate(input),
}));

vi.mock("../../../shared/logger", () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

// Firestore モック: videos 一覧・transcriptChunks の listDocuments / set
const mockVideosGet = vi.fn();
const mockListDocuments = vi.fn();
const mockSet = vi.fn(async (_doc: Record<string, unknown>) => undefined);

vi.mock("../../../infrastructure/database/firestore", () => ({
	default: {
		collection: () => ({
			select: () => ({ get: mockVideosGet }),
			doc: () => ({
				collection: () => ({
					listDocuments: mockListDocuments,
					doc: () => ({ set: mockSet }),
				}),
			}),
		}),
	},
}));

const { runTranscribeBacklog } = await import("../transcribe-backlog");

const GEMINI_TEXT = JSON.stringify({
	utterances: [{ start: 1.0, end: 2.5, text: "こんにちは" }],
});

/** 動画 doc モック（PT 表記の duration・archived/embeddable 切替可能） */
function videoDoc(
	id: string,
	{
		duration = "PT15M",
		archived = true,
		embeddable = true,
		publishedAt = "2026-07-01T00:00:00Z",
	} = {},
) {
	return {
		id,
		data: () => ({
			duration,
			liveStreamingDetails: archived ? { actualEndTime: "2026-07-01T02:00:00Z" } : undefined,
			status: { embeddable },
			publishedAt,
		}),
	};
}

describe("runTranscribeBacklog (SPR-293)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		delete process.env.TRANSCRIBE_CHUNKS_PER_RUN;
		mockGenerate.mockResolvedValue({ success: true, text: GEMINI_TEXT, totalTokens: 60000 });
		mockListDocuments.mockResolvedValue([]);
	});

	it("未生成チャンクを生成して保存する（15分動画=チャンク2枚）", async () => {
		mockVideosGet.mockResolvedValue({ docs: [videoDoc("video-00001")] });

		const result = await runTranscribeBacklog();

		expect(result.processedChunks).toBe(2);
		expect(result.failedChunks).toBe(0);
		expect(result.backlogRemaining).toBe(false);
		expect(mockSet).toHaveBeenCalledTimes(2);
		const written = mockSet.mock.calls[0]?.[0] as Record<string, unknown>;
		expect(written.chunkIndex).toBe(0);
		// Firestore は Date を Timestamp として保存する（新規コレクションの日時規約）
		expect(written.createdAt).toBeInstanceOf(Date);
	});

	it("生成済みチャンクはスキップする（チェックポイント=doc 存在）", async () => {
		mockVideosGet.mockResolvedValue({ docs: [videoDoc("video-00001")] });
		mockListDocuments.mockResolvedValue([{ id: "0" }]);

		const result = await runTranscribeBacklog();

		expect(result.processedChunks).toBe(1);
		const call = mockGenerate.mock.calls[0]?.[0] as { startOffsetSeconds: number };
		expect(call.startOffsetSeconds).toBe(600);
	});

	it("チャンク予算で打ち切り backlogRemaining=true を返す", async () => {
		process.env.TRANSCRIBE_CHUNKS_PER_RUN = "1";
		mockVideosGet.mockResolvedValue({ docs: [videoDoc("video-00001")] });

		const result = await runTranscribeBacklog();

		expect(result.processedChunks).toBe(1);
		expect(result.backlogRemaining).toBe(true);
	});

	it("新しい動画から先に処理する", async () => {
		process.env.TRANSCRIBE_CHUNKS_PER_RUN = "1";
		mockVideosGet.mockResolvedValue({
			docs: [
				videoDoc("older-video-1", { publishedAt: "2026-01-01T00:00:00Z" }),
				videoDoc("newer-video-1", { publishedAt: "2026-07-01T00:00:00Z" }),
			],
		});

		await runTranscribeBacklog();

		const call = mockGenerate.mock.calls[0]?.[0] as { videoId: string };
		expect(call.videoId).toBe("newer-video-1");
	});

	it("生成失敗は保存せず次の動画へ進む（次回リトライ）", async () => {
		mockVideosGet.mockResolvedValue({
			docs: [
				videoDoc("video-00001", { publishedAt: "2026-07-01T00:00:00Z" }),
				videoDoc("video-00002", { publishedAt: "2026-06-01T00:00:00Z" }),
			],
		});
		mockGenerate
			.mockResolvedValueOnce({ success: false, error: "HTTP 403" })
			.mockResolvedValue({ success: true, text: GEMINI_TEXT });

		const result = await runTranscribeBacklog();

		// 1本目は初回失敗で打ち切り→2本目の2チャンクを処理
		expect(result.failedChunks).toBe(1);
		expect(result.processedChunks).toBe(2);
		const videoIds = mockGenerate.mock.calls.map((c) => (c[0] as { videoId: string }).videoId);
		expect(videoIds).toEqual(["video-00001", "video-00002", "video-00002"]);
	});

	it("配信アーカイブ以外・埋め込み不可・duration 不明はスキップする", async () => {
		mockVideosGet.mockResolvedValue({
			docs: [
				videoDoc("normal-video-1", { archived: false }),
				videoDoc("no-embed-vide1", { embeddable: false }),
				videoDoc("no-duration-1", { duration: "" }),
			],
		});

		const result = await runTranscribeBacklog();

		expect(result.processedChunks).toBe(0);
		expect(result.scannedVideos).toBe(0);
		expect(mockGenerate).not.toHaveBeenCalled();
	});

	it("解釈不能な応答は保存せず失敗として数える", async () => {
		mockVideosGet.mockResolvedValue({ docs: [videoDoc("video-00001")] });
		mockGenerate.mockResolvedValue({ success: true, text: "not json" });

		const result = await runTranscribeBacklog();

		expect(result.failedChunks).toBe(1);
		expect(mockSet).not.toHaveBeenCalled();
	});
});
