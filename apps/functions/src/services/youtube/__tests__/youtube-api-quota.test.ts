import type { youtube_v3 } from "googleapis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// quota monitor をモックして quota 充足/不足の両分岐を検証する
const canExecuteOperation = vi.fn((..._a: unknown[]) => true);
const recordQuotaUsage = vi.fn();
const logQuotaUsage = vi.fn();
const suggestOptimalOperations = vi.fn(() => ({ feasible: true, alternatives: [] as string[] }));
vi.mock("../../../infrastructure/monitoring/youtube-quota-monitor", () => ({
	canExecuteOperation: (...a: unknown[]) => canExecuteOperation(...a),
	recordQuotaUsage: (...a: unknown[]) => recordQuotaUsage(...a),
	getYouTubeQuotaMonitor: () => ({ logQuotaUsage, suggestOptimalOperations }),
	QUOTA_COSTS: {
		search: 100,
		videosFullDetails: 1,
		videosWithSnippet: 1,
		playlists: 1,
		playlistItems: 1,
		channels: 1,
	},
}));

vi.mock("../../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

import {
	fetchChannelPlaylists,
	fetchPlaylistItems,
	fetchUploadsPlaylistId,
	fetchUploadsPlaylistPage,
	fetchVideoDetails,
} from "../youtube-api";

const makeClient = () => ({
	videos: { list: vi.fn() },
	playlists: { list: vi.fn() },
	playlistItems: { list: vi.fn() },
	channels: { list: vi.fn() },
});
const asYoutube = (c: ReturnType<typeof makeClient>) => c as unknown as youtube_v3.Youtube;

beforeEach(() => {
	canExecuteOperation.mockReturnValue(true);
	suggestOptimalOperations.mockReturnValue({ feasible: true, alternatives: [] });
});

afterEach(() => {
	vi.clearAllMocks();
});

describe("fetchVideoDetails: クォータ分岐", () => {
	it("不足かつ代替不能なら例外（alternatives を含む）", async () => {
		canExecuteOperation.mockReturnValue(false);
		suggestOptimalOperations.mockReturnValue({ feasible: false, alternatives: ["後で再試行"] });
		await expect(fetchVideoDetails(asYoutube(makeClient()), ["v1"])).rejects.toThrow("後で再試行");
	});

	it("不足でも代替可能なら処理を継続する", async () => {
		canExecuteOperation.mockReturnValue(false);
		suggestOptimalOperations.mockReturnValue({ feasible: true, alternatives: [] });
		const c = makeClient();
		c.videos.list.mockResolvedValue({ data: { items: [{ id: "v1" }] } });
		const r = await fetchVideoDetails(asYoutube(c), ["v1"]);
		expect(r).toHaveLength(1);
	});
});

describe("fetchChannelPlaylists", () => {
	it("クォータ不足は例外", async () => {
		canExecuteOperation.mockReturnValue(false);
		await expect(fetchChannelPlaylists(asYoutube(makeClient()), "ch")).rejects.toThrow("クォータ");
	});

	it("プレイリストを既定値付きで写像する", async () => {
		const c = makeClient();
		c.playlists.list.mockResolvedValue({
			data: {
				items: [
					{
						id: "p1",
						snippet: { title: "PL1", description: "d", publishedAt: "2024" },
						contentDetails: { itemCount: 3 },
					},
					{}, // 欠落フィールド → 既定値
				],
			},
		});
		const r = await fetchChannelPlaylists(asYoutube(c), "ch");
		expect(r[0]).toEqual({
			id: "p1",
			title: "PL1",
			videoCount: 3,
			description: "d",
			publishedAt: "2024",
		});
		expect(r[1]).toEqual({ id: "", title: "", videoCount: 0, description: "", publishedAt: "" });
		expect(recordQuotaUsage).toHaveBeenCalledWith("playlists");
	});

	it("items 無しは空配列", async () => {
		const c = makeClient();
		c.playlists.list.mockResolvedValue({ data: {} });
		expect(await fetchChannelPlaylists(asYoutube(c), "ch")).toEqual([]);
	});

	it("API エラーは再 throw", async () => {
		const c = makeClient();
		c.playlists.list.mockRejectedValue(new Error("pl fail"));
		await expect(fetchChannelPlaylists(asYoutube(c), "ch")).rejects.toThrow("pl fail");
	});
});

describe("fetchPlaylistItems", () => {
	it("クォータ不足は空配列（即 break）", async () => {
		canExecuteOperation.mockReturnValue(false);
		expect(await fetchPlaylistItems(asYoutube(makeClient()), "pl")).toEqual([]);
	});

	it("ページネーションして videoId を集約する（空 videoId は除外）", async () => {
		const c = makeClient();
		c.playlistItems.list
			.mockResolvedValueOnce({
				data: { items: [{ contentDetails: { videoId: "a" } }], nextPageToken: "n1" },
			})
			.mockResolvedValueOnce({
				data: { items: [{ contentDetails: { videoId: "b" } }, { contentDetails: {} }] },
			});
		const r = await fetchPlaylistItems(asYoutube(c), "pl");
		expect(r).toEqual(["a", "b"]);
		expect(c.playlistItems.list).toHaveBeenCalledTimes(2);
	});

	it("API エラーは break して取得済みを返す", async () => {
		const c = makeClient();
		c.playlistItems.list.mockRejectedValue(new Error("items fail"));
		expect(await fetchPlaylistItems(asYoutube(c), "pl")).toEqual([]);
	});
});

describe("fetchUploadsPlaylistId", () => {
	it("クォータ不足は例外", async () => {
		canExecuteOperation.mockReturnValue(false);
		await expect(fetchUploadsPlaylistId(asYoutube(makeClient()), "ch")).rejects.toThrow("クォータ");
	});

	it("uploads playlist IDを返す", async () => {
		const c = makeClient();
		c.channels.list.mockResolvedValue({
			data: { items: [{ contentDetails: { relatedPlaylists: { uploads: "UUxxxx" } } }] },
		});
		const r = await fetchUploadsPlaylistId(asYoutube(c), "ch");
		expect(r).toBe("UUxxxx");
		expect(recordQuotaUsage).toHaveBeenCalledWith("channels");
	});

	it("items無し・uploads無しはundefined", async () => {
		const c = makeClient();
		c.channels.list.mockResolvedValue({ data: {} });
		expect(await fetchUploadsPlaylistId(asYoutube(c), "ch")).toBeUndefined();
	});

	it("API エラーは再throw", async () => {
		const c = makeClient();
		c.channels.list.mockRejectedValue(new Error("channels fail"));
		await expect(fetchUploadsPlaylistId(asYoutube(c), "ch")).rejects.toThrow("channels fail");
	});
});

describe("fetchUploadsPlaylistPage", () => {
	it("クォータ不足は例外", async () => {
		canExecuteOperation.mockReturnValue(false);
		await expect(fetchUploadsPlaylistPage(asYoutube(makeClient()), "UUxxxx")).rejects.toThrow(
			"クォータ",
		);
	});

	it("1ページ分のvideoIdとnextPageTokenを返す（空videoIdは除外）", async () => {
		const c = makeClient();
		c.playlistItems.list.mockResolvedValue({
			data: {
				items: [{ contentDetails: { videoId: "a" } }, { contentDetails: {} }],
				nextPageToken: "n1",
			},
		});
		const r = await fetchUploadsPlaylistPage(asYoutube(c), "UUxxxx");
		expect(r).toEqual({ videoIds: ["a"], nextPageToken: "n1" });
		expect(c.playlistItems.list).toHaveBeenCalledWith(
			expect.objectContaining({ playlistId: "UUxxxx", pageToken: undefined }),
		);
		expect(recordQuotaUsage).toHaveBeenCalledWith("playlistItems");
	});

	it("items無しは空配列", async () => {
		const c = makeClient();
		c.playlistItems.list.mockResolvedValue({ data: {} });
		expect(await fetchUploadsPlaylistPage(asYoutube(c), "UUxxxx")).toEqual({
			videoIds: [],
			nextPageToken: undefined,
		});
	});

	it("API エラーは再throw", async () => {
		const c = makeClient();
		c.playlistItems.list.mockRejectedValue(new Error("page fail"));
		await expect(fetchUploadsPlaylistPage(asYoutube(c), "UUxxxx")).rejects.toThrow("page fail");
	});
});
