/**
 * YouTube Firestore Service Tests
 */

import type { youtube_v3 } from "googleapis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SUZUKA_MINASE_CHANNEL_ID } from "../../../shared/common";

const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockDocGet = vi.fn();
const mockDocSet = vi.fn().mockResolvedValue(undefined);
const mockDoc = vi.fn((id: string) => ({ id, get: mockDocGet, set: mockDocSet }));
const mockGetAll = vi.fn();
const mockSelectGet = vi.fn();
const mockWhereOrderByGet = vi.fn();
const mockWhereSelectLimitGet = vi.fn();
const mockWhereSelectGet = vi.fn();
const mockOrderBy = vi.fn((..._args: unknown[]) => ({
	select: vi.fn(() => ({
		limit: vi.fn(() => ({ get: mockWhereOrderByGet })),
	})),
}));
const mockWhere = vi.fn((..._args: unknown[]) => ({
	orderBy: (...args: unknown[]) => mockOrderBy(...args),
	select: (..._selectArgs: unknown[]) => ({
		limit: vi.fn(() => ({ get: mockWhereSelectLimitGet })),
		get: mockWhereSelectGet,
	}),
}));
// テスト用Timestamp実装: `instanceof Timestamp`（youtube-firestore.tsの実装）を
// テストからも通せるよう、実クラスとして定義しfromDate/now/toDateを実装する。
// vi.mockファクトリ内から参照するためvi.hoisted()で定義する必要がある。
const { MockTimestampClass, mockTimestamp } = vi.hoisted(() => {
	class MockTimestampClass {
		seconds: number;
		constructor(seconds: number) {
			this.seconds = seconds;
		}
		toDate(): Date {
			return new Date(this.seconds * 1000);
		}
		static now(): MockTimestampClass {
			return new MockTimestampClass(0);
		}
		static fromDate(date: Date): MockTimestampClass {
			return new MockTimestampClass(Math.floor(date.getTime() / 1000));
		}
	}
	return { MockTimestampClass, mockTimestamp: MockTimestampClass };
});
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
	Timestamp: mockTimestamp,
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
	getOldTierDueVideoIds,
	getPlaylistMappingCache,
	getRecentTierVideoIds,
	getStaleLiveVideoIds,
	savePlaylistMappingCache,
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

describe("getPlaylistMappingCache / savePlaylistMappingCache（SPR-261/262）", () => {
	it("キャッシュが存在しない場合はundefinedを返す", async () => {
		mockDocGet.mockResolvedValue({ exists: false });

		const result = await getPlaylistMappingCache();

		expect(result).toBeUndefined();
	});

	it("キャッシュが存在する場合はMapとupdatedAtJSTを返す", async () => {
		mockDocGet.mockResolvedValue({
			exists: true,
			data: () => ({
				mapping: { v1: ["配信アーカイブ"], v2: ["歌ってみた", "雑談"] },
				updatedAtJST: "2026-07-20",
			}),
		});

		const result = await getPlaylistMappingCache();

		expect(result?.updatedAtJST).toBe("2026-07-20");
		expect(result?.mapping).toEqual(
			new Map([
				["v1", ["配信アーカイブ"]],
				["v2", ["歌ってみた", "雑談"]],
			]),
		);
	});

	it("保存時はMapをRecordに変換してdoc.setに渡す", async () => {
		const mapping = new Map([["v1", ["配信アーカイブ"]]]);

		await savePlaylistMappingCache(mapping, "2026-07-20");

		expect(mockDocSet).toHaveBeenCalledWith(
			expect.objectContaining({
				mapping: { v1: ["配信アーカイブ"] },
				updatedAtJST: "2026-07-20",
			}),
		);
	});
});

describe("getRecentTierVideoIds（SPR-261/262）", () => {
	it("publishedAtの範囲クエリでIDのみを返す", async () => {
		mockWhereSelectLimitGet.mockResolvedValue({
			docs: [{ id: "recent1" }, { id: "recent2" }],
		});

		const today = new Date("2026-07-20T00:00:00.000Z");
		const result = await getRecentTierVideoIds(30, today);

		expect(result).toEqual(["recent1", "recent2"]);
		expect(mockWhere).toHaveBeenCalledWith("publishedAt", ">=", expect.any(MockTimestampClass));
	});
});

describe("getOldTierDueVideoIds（SPR-261/262）", () => {
	const today = new Date("2026-07-20T00:00:00.000Z");

	it("当日JSTで既に再取得済みの動画は除外する", async () => {
		mockWhereSelectGet.mockResolvedValue({
			docs: [
				{
					id: "already-done",
					get: () => MockTimestampClass.fromDate(new Date("2026-07-20T01:00:00.000Z")),
				},
				{
					id: "due",
					get: () => MockTimestampClass.fromDate(new Date("2026-07-10T01:00:00.000Z")),
				},
			],
		});

		const result = await getOldTierDueVideoIds(30, today, "2026-07-20");

		expect(result).toEqual(["due"]);
	});

	it("lastFetchedAt昇順（最も長く放置された順）に並べ、limitで切る", async () => {
		mockWhereSelectGet.mockResolvedValue({
			docs: [
				{ id: "newer", get: () => MockTimestampClass.fromDate(new Date("2026-07-15T00:00:00Z")) },
				{ id: "oldest", get: () => MockTimestampClass.fromDate(new Date("2026-06-01T00:00:00Z")) },
				{ id: "middle", get: () => MockTimestampClass.fromDate(new Date("2026-07-01T00:00:00Z")) },
			],
		});

		const result = await getOldTierDueVideoIds(30, today, "2026-07-20", 2);

		expect(result).toEqual(["oldest", "middle"]);
	});

	it("該当が無い場合は空配列を返す", async () => {
		mockWhereSelectGet.mockResolvedValue({ docs: [] });

		const result = await getOldTierDueVideoIds(30, today, "2026-07-20");

		expect(result).toEqual([]);
	});
});
