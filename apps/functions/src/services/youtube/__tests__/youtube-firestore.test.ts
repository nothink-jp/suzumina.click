/**
 * YouTube Firestore Service Tests
 */

import type { youtube_v3 } from "googleapis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SUZUKA_MINASE_CHANNEL_ID } from "../../../shared/common";

const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockDoc = vi.fn((id: string) => ({ id }));
const mockGetAll = vi.fn();
const mockSelectGet = vi.fn();
const mockWhereOrderByGet = vi.fn();
const mockOrderBy = vi.fn((..._args: unknown[]) => ({
	select: vi.fn(() => ({
		limit: vi.fn(() => ({ get: mockWhereOrderByGet })),
	})),
}));
const mockWhere = vi.fn((..._args: unknown[]) => ({
	orderBy: (...args: unknown[]) => mockOrderBy(...args),
}));
vi.mock("../../../infrastructure/database/firestore", () => ({
	default: {
		collection: vi.fn(() => ({
			doc: mockDoc,
			select: vi.fn(() => ({ get: mockSelectGet })),
			where: (...args: unknown[]) => mockWhere(...args),
		})),
		batch: vi.fn(() => ({ set: mockBatchSet, commit: mockBatchCommit })),
		getAll: (...refs: unknown[]) => mockGetAll(...refs),
	},
}));

vi.mock("../../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

const fromYouTubeAPI = vi.fn();
const fromYouTubeAPIWithTags = vi.fn();
vi.mock("../../mappers/video-mapper", () => ({
	VideoMapper: {
		fromYouTubeAPI: (...a: unknown[]) => fromYouTubeAPI(...a),
		fromYouTubeAPIWithTags: (...a: unknown[]) => fromYouTubeAPIWithTags(...a),
	},
}));

import {
	getAllVideoIds,
	getKnownVideoIdsSet,
	getStaleLiveVideoIds,
	saveVideosToFirestore,
} from "../youtube-firestore";

// videoToFirestore（実物）が受け付ける最小の VideoPlainObject
const plainObject = (id = "v1") =>
	({
		id,
		videoId: id,
		title: "t",
		publishedAt: "2024-01-01T00:00:00.000Z",
		lastFetchedAt: "2024-01-01T00:00:00.000Z",
		_computed: { videoType: "normal" },
	}) as any;

const ytVideo = (over: Partial<youtube_v3.Schema$Video> = {}): youtube_v3.Schema$Video => ({
	id: "v1",
	snippet: { channelId: SUZUKA_MINASE_CHANNEL_ID, title: "動画", ...over.snippet },
	...over,
});

beforeEach(() => {
	fromYouTubeAPI.mockReturnValue(plainObject());
	fromYouTubeAPIWithTags.mockReturnValue(plainObject());
	mockBatchCommit.mockResolvedValue(undefined);
});

afterEach(() => {
	vi.clearAllMocks();
});

describe("saveVideosToFirestore", () => {
	it("空配列は 0 を返しコミットしない", async () => {
		expect(await saveVideosToFirestore([])).toBe(0);
		expect(mockBatchCommit).not.toHaveBeenCalled();
	});

	it("channelId 欠落・不許可チャンネルはスキップされる", async () => {
		const result = await saveVideosToFirestore([
			ytVideo({ id: "no-channel", snippet: { title: "x" } }), // channelId 欠落
			ytVideo({ id: "other", snippet: { channelId: "OTHER", title: "x" } }), // 不許可
		]);
		expect(result).toBe(0);
		expect(mockBatchCommit).not.toHaveBeenCalled();
	});

	it("許可チャンネルの動画を保存しコミットする", async () => {
		const result = await saveVideosToFirestore([ytVideo({ id: "v1" }), ytVideo({ id: "v2" })]);
		expect(result).toBe(2);
		expect(mockBatchSet).toHaveBeenCalledTimes(2);
		expect(mockBatchCommit).toHaveBeenCalledTimes(1);
	});

	it("マッピング失敗の動画はバッチに含めない", async () => {
		fromYouTubeAPIWithTags.mockReturnValueOnce(null).mockReturnValueOnce(plainObject("v2"));
		const result = await saveVideosToFirestore([ytVideo({ id: "v1" }), ytVideo({ id: "v2" })]);
		expect(result).toBe(1);
	});

	it("コミット失敗時は 0 を返す", async () => {
		mockBatchCommit.mockRejectedValue(new Error("commit fail"));
		const result = await saveVideosToFirestore([ytVideo({ id: "v1" })]);
		expect(result).toBe(0);
	});
});

describe("getKnownVideoIdsSet", () => {
	it("空配列はgetAllを呼ばず空集合を返す", async () => {
		const result = await getKnownVideoIdsSet([]);
		expect(result.size).toBe(0);
		expect(mockGetAll).not.toHaveBeenCalled();
	});

	it("既存ドキュメントのIDのみを集合に含める", async () => {
		mockGetAll.mockResolvedValue([
			{ id: "v1", exists: true },
			{ id: "v2", exists: false },
			{ id: "v3", exists: true },
		]);

		const result = await getKnownVideoIdsSet(["v1", "v2", "v3"]);

		expect(result).toEqual(new Set(["v1", "v3"]));
	});

	it("300件超は複数チャンクに分割してgetAllを呼ぶ", async () => {
		const videoIds = Array.from({ length: 350 }, (_, i) => `v${i}`);
		mockGetAll.mockImplementation(async (...refs: { id: string }[]) =>
			refs.map((ref) => ({ id: ref.id, exists: true })),
		);

		const result = await getKnownVideoIdsSet(videoIds);

		expect(mockGetAll).toHaveBeenCalledTimes(2);
		expect(result.size).toBe(350);
	});
});

describe("getAllVideoIds", () => {
	it("videosコレクション全件のIDを集合として返す", async () => {
		mockSelectGet.mockResolvedValue({
			docs: [{ id: "v1" }, { id: "v2" }, { id: "v3" }],
		});

		const result = await getAllVideoIds();

		expect(result).toEqual(new Set(["v1", "v2", "v3"]));
	});

	it("コレクションが空の場合は空集合を返す", async () => {
		mockSelectGet.mockResolvedValue({ docs: [] });

		const result = await getAllVideoIds();

		expect(result.size).toBe(0);
	});
});

describe("getStaleLiveVideoIds", () => {
	it("liveBroadcastContentがlive/upcomingのままの動画IDのみを、lastFetchedAt昇順で返す", async () => {
		mockWhereOrderByGet.mockResolvedValue({
			docs: [{ id: "live1" }, { id: "upcoming1" }],
		});

		const result = await getStaleLiveVideoIds();

		expect(result).toEqual({ videoIds: ["live1", "upcoming1"], truncated: false });
		expect(mockWhere).toHaveBeenCalledWith("liveBroadcastContent", "in", ["live", "upcoming"]);
		expect(mockOrderBy).toHaveBeenCalledWith("lastFetchedAt", "asc");
	});

	it("該当が無い場合は空配列を返す", async () => {
		mockWhereOrderByGet.mockResolvedValue({ docs: [] });

		const result = await getStaleLiveVideoIds();

		expect(result).toEqual({ videoIds: [], truncated: false });
	});

	it("上限件数に達した場合はtruncated:trueを返す", async () => {
		const docs = Array.from({ length: 50 }, (_, i) => ({ id: `stale${i}` }));
		mockWhereOrderByGet.mockResolvedValue({ docs });

		const result = await getStaleLiveVideoIds();

		expect(result.truncated).toBe(true);
		expect(result.videoIds).toHaveLength(50);
	});
});
