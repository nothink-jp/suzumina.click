/**
 * youtube.ts のテスト（SPR-230: discoveryモード切替・early-stop・週次フルスイープ 中心）
 *
 * サービス層（youtube-api.ts / youtube-firestore.ts）はモックし、
 * dlsite-individual-info-api.test.tsと同様のパターンでエンドポイントの分岐を検証する。
 */

import type { youtube_v3 } from "googleapis";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../infrastructure/database/firestore", () => {
	const updateMock = vi.fn().mockResolvedValue(undefined);
	const getMock = vi.fn().mockResolvedValue({ exists: false });
	const createMock = vi.fn().mockResolvedValue(undefined);
	const docRef = { update: updateMock, get: getMock, create: createMock };
	const collection = vi.fn(() => ({ doc: vi.fn(() => docRef) }));

	return {
		default: { collection, getAll: vi.fn() },
		Timestamp: { now: vi.fn(() => ({ seconds: 0, nanoseconds: 0 })) },
		__updateMock: updateMock,
		__getMock: getMock,
		__createMock: createMock,
	};
});

vi.mock("../../services/youtube/youtube-api", () => ({
	initializeYouTubeClient: vi.fn(),
	searchVideos: vi.fn(),
	extractVideoIds: vi.fn(),
	fetchVideoDetails: vi.fn(),
	fetchChannelPlaylists: vi.fn(),
	fetchPlaylistItems: vi.fn(),
	fetchUploadsPlaylistId: vi.fn(),
	fetchUploadsPlaylistPage: vi.fn(),
}));

vi.mock("../../services/youtube/youtube-firestore", () => ({
	saveVideosToFirestore: vi.fn(),
	getKnownVideoIdsSet: vi.fn(),
	getAllVideoIds: vi.fn(),
	getStaleLiveVideoIds: vi.fn(),
	getRecentTierVideoIds: vi.fn(),
	getOldTierDueVideoIds: vi.fn(),
	getPlaylistMappingCache: vi.fn(),
	savePlaylistMappingCache: vi.fn(),
	MAX_STALE_LIVE_VIDEO_IDS: 50,
}));

vi.mock("../../shared/logger", () => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

const { fetchYouTubeVideos } = await import("../youtube");
const youtubeApi = await import("../../services/youtube/youtube-api");
const youtubeFirestore = await import("../../services/youtube/youtube-firestore");
const logger = await import("../../shared/logger");
const firestoreMock = vi.mocked(await import("../../infrastructure/database/firestore"));
const updateMock = (firestoreMock as unknown as { __updateMock: ReturnType<typeof vi.fn> })
	.__updateMock;
const getMetadataMock = (firestoreMock as unknown as { __getMock: ReturnType<typeof vi.fn> })
	.__getMock;
const createMetadataMock = (firestoreMock as unknown as { __createMock: ReturnType<typeof vi.fn> })
	.__createMock;

const dummyClient = {} as youtube_v3.Youtube;

// 本番GCFv2（Eventarc経由）と同じMessagePublishedData envelope（message一段ネスト）で
// 組み立てる。平坦形（event.data.data直下）でモックするとテストだけ通って本番で
// mode検出が縮退する（SPR-229/230の週次フルスイープ未発火の回帰）。
// 既定ペイロードは毎時ジョブと同じ `{}`（terraform/scheduler.tf の base64encode("{}")）。
function pubsubEvent(payload: Record<string, unknown> = {}) {
	return {
		type: "google.cloud.pubsub.topic.v1.messagePublished",
		data: {
			message: {
				data: Buffer.from(JSON.stringify(payload)).toString("base64"),
			},
		},
	} as unknown as Parameters<typeof fetchYouTubeVideos>[0];
}

beforeEach(() => {
	vi.clearAllMocks();
	delete process.env.YOUTUBE_DISCOVERY_MODE;

	getMetadataMock.mockResolvedValue({ exists: false });
	vi.mocked(youtubeApi.initializeYouTubeClient).mockReturnValue([dummyClient, undefined]);
	vi.mocked(youtubeApi.fetchChannelPlaylists).mockResolvedValue([]);
	vi.mocked(youtubeApi.fetchPlaylistItems).mockResolvedValue([]);
	vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([]);
	vi.mocked(youtubeFirestore.saveVideosToFirestore).mockResolvedValue(0);
	vi.mocked(youtubeFirestore.getKnownVideoIdsSet).mockResolvedValue(new Set());
	vi.mocked(youtubeFirestore.getAllVideoIds).mockResolvedValue(new Set());
	vi.mocked(youtubeFirestore.getStaleLiveVideoIds).mockResolvedValue({
		videoIds: [],
		truncated: false,
	});
	vi.mocked(youtubeFirestore.getRecentTierVideoIds).mockResolvedValue([]);
	vi.mocked(youtubeFirestore.getOldTierDueVideoIds).mockResolvedValue([]);
	vi.mocked(youtubeFirestore.getPlaylistMappingCache).mockResolvedValue(undefined);
	vi.mocked(youtubeFirestore.savePlaylistMappingCache).mockResolvedValue(undefined);
	delete process.env.YOUTUBE_PLAYLIST_CACHE_ENABLED;
	delete process.env.YOUTUBE_STATS_TIER_REFRESH_ENABLED;
});

describe("fetchYouTubeVideos: 通常run（既定=searchモード）", () => {
	it("search.listベースの経路で動画を取得・保存する", async () => {
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue(["v1", "v2"]);
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "v1" } as youtube_v3.Schema$Video,
			{ id: "v2" } as youtube_v3.Schema$Video,
		]);
		vi.mocked(youtubeFirestore.saveVideosToFirestore).mockResolvedValue(2);

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeApi.searchVideos).toHaveBeenCalled();
		expect(youtubeApi.fetchUploadsPlaylistId).not.toHaveBeenCalled();
		expect(youtubeFirestore.saveVideosToFirestore).toHaveBeenCalled();
	});
});

describe("fetchYouTubeVideos: stale live/upcoming動画の再取得（SPR-230回帰対応）", () => {
	it("新着0件でもstale live動画をfetchVideoDetails対象に含めて保存する（回帰の核心）", async () => {
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue([]);
		vi.mocked(youtubeFirestore.getStaleLiveVideoIds).mockResolvedValue({
			videoIds: ["stale1"],
			truncated: false,
		});
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "stale1" } as youtube_v3.Schema$Video,
		]);
		vi.mocked(youtubeFirestore.saveVideosToFirestore).mockResolvedValue(1);

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeApi.fetchVideoDetails).toHaveBeenCalledWith(dummyClient, ["stale1"]);
		expect(youtubeFirestore.saveVideosToFirestore).toHaveBeenCalled();
	});

	it("新着とstaleが両方ある場合はマージ・重複排除して渡す", async () => {
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue(["new1", "dup"]);
		vi.mocked(youtubeFirestore.getStaleLiveVideoIds).mockResolvedValue({
			videoIds: ["stale1", "dup"],
			truncated: false,
		});
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([]);

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeApi.fetchVideoDetails).toHaveBeenCalledWith(
			dummyClient,
			expect.arrayContaining(["new1", "stale1", "dup"]),
		);
		const call = vi.mocked(youtubeApi.fetchVideoDetails).mock.calls[0];
		expect(call).toBeDefined();
		const [, calledVideoIds] = call ?? [];
		expect(calledVideoIds).toHaveLength(3);
	});

	it("stale無し・新着0件のときは従来通り早期returnする（非回帰確認）", async () => {
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue([]);
		vi.mocked(youtubeFirestore.getStaleLiveVideoIds).mockResolvedValue({
			videoIds: [],
			truncated: false,
		});

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeApi.fetchVideoDetails).not.toHaveBeenCalled();
		expect(youtubeFirestore.saveVideosToFirestore).not.toHaveBeenCalled();
	});

	it("stale救済クエリが失敗しても、run全体は失敗させず新着分は保存する", async () => {
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue(["new1"]);
		vi.mocked(youtubeFirestore.getStaleLiveVideoIds).mockRejectedValue(
			new Error("Firestore query failed"),
		);
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "new1" } as youtube_v3.Schema$Video,
		]);
		vi.mocked(youtubeFirestore.saveVideosToFirestore).mockResolvedValue(1);

		await fetchYouTubeVideos(pubsubEvent());

		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining("stale live/upcoming動画の取得に失敗しました"),
			expect.anything(),
		);
		// stale救済はスキップされるが、新着分の取得・保存は継続する
		expect(youtubeApi.fetchVideoDetails).toHaveBeenCalledWith(dummyClient, ["new1"]);
		expect(youtubeFirestore.saveVideosToFirestore).toHaveBeenCalled();
		// runはエラーとして記録されない
		expect(updateMock).not.toHaveBeenCalledWith(
			expect.objectContaining({ lastError: expect.anything() }),
		);
	});
});

describe("fetchYouTubeVideos: shadowモード", () => {
	it("既存経路の保存は維持しつつ、uploads playlist全走査との比較ログを追加で出す", async () => {
		process.env.YOUTUBE_DISCOVERY_MODE = "shadow";
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue(["v1"]);
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "v1" } as youtube_v3.Schema$Video,
		]);
		vi.mocked(youtubeApi.fetchUploadsPlaylistId).mockResolvedValue("UUxxxx");
		vi.mocked(youtubeApi.fetchUploadsPlaylistPage).mockResolvedValue({
			videoIds: ["v1"],
			nextPageToken: undefined,
		});
		vi.mocked(youtubeFirestore.getAllVideoIds).mockResolvedValue(new Set(["v1"]));

		await fetchYouTubeVideos(pubsubEvent());

		// 既存経路（search.list）は維持される
		expect(youtubeApi.searchVideos).toHaveBeenCalled();
		// 追加で比較用にuploads playlist側も呼ばれる
		expect(youtubeApi.fetchUploadsPlaylistId).toHaveBeenCalled();
		expect(youtubeApi.fetchUploadsPlaylistPage).toHaveBeenCalled();
		expect(youtubeFirestore.getAllVideoIds).toHaveBeenCalled();
		// 発見集合が一致しているのでinfoログ（警告ではない）
		expect(logger.warn).not.toHaveBeenCalledWith(
			expect.stringContaining("差分があります"),
			expect.anything(),
		);
	});

	it("発見集合に差分がある場合はwarnログを出す（保存フロー自体は継続する）", async () => {
		process.env.YOUTUBE_DISCOVERY_MODE = "shadow";
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue([]);
		vi.mocked(youtubeApi.fetchUploadsPlaylistId).mockResolvedValue("UUxxxx");
		vi.mocked(youtubeApi.fetchUploadsPlaylistPage).mockResolvedValue({
			videoIds: ["v1"],
			nextPageToken: undefined,
		});
		// Firestoreにはv2があるが、uploads playlist走査では見つからない → 差分あり
		vi.mocked(youtubeFirestore.getAllVideoIds).mockResolvedValue(new Set(["v2"]));

		const result = await fetchYouTubeVideos(pubsubEvent());

		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining("差分があります"),
			expect.anything(),
		);
		// 比較の失敗/差分検出自体は本処理の完了を妨げない
		expect(result).toBeUndefined();
	});

	it("全走査がページ上限で打ち切られた場合はmissing判定をスキップして警告する（レビュー指摘対応）", async () => {
		process.env.YOUTUBE_DISCOVERY_MODE = "shadow";
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue([]);
		vi.mocked(youtubeApi.fetchUploadsPlaylistId).mockResolvedValue("UUxxxx");
		// 常にnextPageTokenありを返し続ける → fetchVideoIdsViaPlaylistFullがページ上限で打ち切られる
		vi.mocked(youtubeApi.fetchUploadsPlaylistPage).mockImplementation(async () => ({
			videoIds: ["v1"],
			nextPageToken: "more",
		}));
		// Firestoreには走査未到達分のv2がある想定（打ち切られなければmissing判定される状況）
		vi.mocked(youtubeFirestore.getAllVideoIds).mockResolvedValue(new Set(["v1", "v2"]));

		await fetchYouTubeVideos(pubsubEvent());

		// ページ上限打ち切りの警告が出る
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining("ページ上限で打ち切られたため、今回はmissing判定をスキップします"),
			expect.anything(),
		);
		// missing判定はスキップされるため「差分があります」ログは出ない
		expect(logger.warn).not.toHaveBeenCalledWith(
			expect.stringContaining("差分があります"),
			expect.anything(),
		);
		// 一致ログも出ない（判定自体をスキップしているため）
		expect(logger.info).not.toHaveBeenCalledWith(
			expect.stringContaining("発見集合が一致しました"),
			expect.anything(),
		);
	});
});

describe("fetchYouTubeVideos: playlistモード（incremental discovery）", () => {
	it("uploads playlist IDが未キャッシュなら取得してメタデータに保存する", async () => {
		process.env.YOUTUBE_DISCOVERY_MODE = "playlist";
		vi.mocked(youtubeApi.fetchUploadsPlaylistId).mockResolvedValue("UUxxxx");
		vi.mocked(youtubeApi.fetchUploadsPlaylistPage).mockResolvedValue({
			videoIds: [],
			nextPageToken: undefined,
		});

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeApi.fetchUploadsPlaylistId).toHaveBeenCalledTimes(1);
		expect(updateMock).toHaveBeenCalledWith(
			expect.objectContaining({ uploadsPlaylistId: "UUxxxx" }),
		);
	});

	it("キャッシュ済みのuploads playlist IDがあれば再取得しない", async () => {
		process.env.YOUTUBE_DISCOVERY_MODE = "playlist";
		getMetadataMock.mockResolvedValue({
			exists: true,
			data: () => ({ isInProgress: false, uploadsPlaylistId: "UUcached" }),
		});
		vi.mocked(youtubeApi.fetchUploadsPlaylistPage).mockResolvedValue({
			videoIds: [],
			nextPageToken: undefined,
		});

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeApi.fetchUploadsPlaylistId).not.toHaveBeenCalled();
		expect(youtubeApi.fetchUploadsPlaylistPage).toHaveBeenCalledWith(
			dummyClient,
			"UUcached",
			undefined,
		);
	});

	it("ページ内に既知IDが混ざったら、それより前の未知IDだけ採用してページングを打ち切る", async () => {
		process.env.YOUTUBE_DISCOVERY_MODE = "playlist";
		getMetadataMock.mockResolvedValue({
			exists: true,
			data: () => ({ isInProgress: false, uploadsPlaylistId: "UUcached" }),
		});
		vi.mocked(youtubeApi.fetchUploadsPlaylistPage).mockResolvedValue({
			videoIds: ["new1", "known1", "known2"],
			nextPageToken: "next-page",
		});
		vi.mocked(youtubeFirestore.getKnownVideoIdsSet).mockResolvedValue(
			new Set(["known1", "known2"]),
		);
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "new1" } as youtube_v3.Schema$Video,
		]);

		await fetchYouTubeVideos(pubsubEvent());

		// 既知IDに当たった時点で打ち切るため、1ページ分しか呼ばれない
		expect(youtubeApi.fetchUploadsPlaylistPage).toHaveBeenCalledTimes(1);
		expect(youtubeApi.fetchVideoDetails).toHaveBeenCalledWith(dummyClient, ["new1"]);
	});

	it("全件が未知（初回バックフィル相当）の場合は次ページまで継続する", async () => {
		process.env.YOUTUBE_DISCOVERY_MODE = "playlist";
		getMetadataMock.mockResolvedValue({
			exists: true,
			data: () => ({ isInProgress: false, uploadsPlaylistId: "UUcached" }),
		});
		vi.mocked(youtubeApi.fetchUploadsPlaylistPage)
			.mockResolvedValueOnce({ videoIds: ["a", "b"], nextPageToken: "p2" })
			.mockResolvedValueOnce({ videoIds: ["c"], nextPageToken: undefined });
		vi.mocked(youtubeFirestore.getKnownVideoIdsSet).mockResolvedValue(new Set());
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "a" } as youtube_v3.Schema$Video,
			{ id: "b" } as youtube_v3.Schema$Video,
			{ id: "c" } as youtube_v3.Schema$Video,
		]);

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeApi.fetchUploadsPlaylistPage).toHaveBeenCalledTimes(2);
		expect(youtubeApi.fetchVideoDetails).toHaveBeenCalledWith(dummyClient, ["a", "b", "c"]);
	});

	it("ページ上限に達しても後続ページが残っている場合はisComplete扱いにせず警告する（レビュー指摘対応）", async () => {
		process.env.YOUTUBE_DISCOVERY_MODE = "playlist";
		getMetadataMock.mockResolvedValue({
			exists: true,
			data: () => ({ isInProgress: false, uploadsPlaylistId: "UUcached" }),
		});
		// 全ページが未知IDのみ・かつ常にnextPageTokenありを返し続ける（ページ上限で強制打ち切りされる状況）
		vi.mocked(youtubeApi.fetchUploadsPlaylistPage).mockImplementation(async () => ({
			videoIds: ["x"],
			nextPageToken: "more",
		}));
		vi.mocked(youtubeFirestore.getKnownVideoIdsSet).mockResolvedValue(new Set());
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "x" } as youtube_v3.Schema$Video,
		]);

		await fetchYouTubeVideos(pubsubEvent());

		// ページ上限到達の警告ログが出る
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining("ページ上限"),
			expect.anything(),
		);
		// isComplete扱いにならないため lastSuccessfulCompleteFetch は更新されない
		expect(updateMock).not.toHaveBeenCalledWith(
			expect.objectContaining({ lastSuccessfulCompleteFetch: expect.anything() }),
		);
	});
});

describe("fetchYouTubeVideos: 週次フルスイープ（mode=weekly_full_sweep）", () => {
	it("通常の詳細取得・保存フローは実行せず、discovery取りこぼし検知のみ行う", async () => {
		vi.mocked(youtubeApi.fetchUploadsPlaylistId).mockResolvedValue("UUxxxx");
		vi.mocked(youtubeApi.fetchUploadsPlaylistPage).mockResolvedValue({
			videoIds: ["v1"],
			nextPageToken: undefined,
		});
		vi.mocked(youtubeFirestore.getAllVideoIds).mockResolvedValue(new Set(["v1"]));

		await fetchYouTubeVideos(pubsubEvent({ mode: "weekly_full_sweep" }));

		expect(youtubeApi.searchVideos).not.toHaveBeenCalled();
		expect(youtubeApi.fetchVideoDetails).not.toHaveBeenCalled();
		expect(youtubeFirestore.saveVideosToFirestore).not.toHaveBeenCalled();
		expect(youtubeApi.fetchUploadsPlaylistId).toHaveBeenCalled();
		expect(youtubeFirestore.getAllVideoIds).toHaveBeenCalled();
	});

	it("週次フルスイープでも通常runと同じ二重実行ロックに従う", async () => {
		getMetadataMock.mockResolvedValue({
			exists: true,
			data: () => ({
				isInProgress: true,
				lastFetchedAt: { toMillis: () => Date.now() },
			}),
		});

		await fetchYouTubeVideos(pubsubEvent({ mode: "weekly_full_sweep" }));

		expect(youtubeApi.fetchUploadsPlaylistId).not.toHaveBeenCalled();
	});
});

describe("fetchYouTubeVideos: 配信中/配信予定の高速反映（mode=fast_recheck）", () => {
	it("stale live/upcoming動画のみを再取得・保存し、統計ティア更新は行わない（discoveryモード既定=searchでは新着発見もしない）", async () => {
		vi.mocked(youtubeFirestore.getStaleLiveVideoIds).mockResolvedValue({
			videoIds: ["live1"],
			truncated: false,
		});
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "live1" } as youtube_v3.Schema$Video,
		]);
		vi.mocked(youtubeFirestore.saveVideosToFirestore).mockResolvedValue(1);

		await fetchYouTubeVideos(pubsubEvent({ mode: "fast_recheck" }));

		expect(youtubeFirestore.getStaleLiveVideoIds).toHaveBeenCalled();
		expect(youtubeApi.fetchVideoDetails).toHaveBeenCalledWith(dummyClient, ["live1"]);
		expect(youtubeFirestore.saveVideosToFirestore).toHaveBeenCalled();
		expect(youtubeApi.searchVideos).not.toHaveBeenCalled();
		expect(youtubeApi.fetchUploadsPlaylistPage).not.toHaveBeenCalled();
		expect(youtubeFirestore.getRecentTierVideoIds).not.toHaveBeenCalled();
		expect(youtubeFirestore.getOldTierDueVideoIds).not.toHaveBeenCalled();
	});

	it("対象が0件ならAPIを呼ばず終了する", async () => {
		vi.mocked(youtubeFirestore.getStaleLiveVideoIds).mockResolvedValue({
			videoIds: [],
			truncated: false,
		});

		await fetchYouTubeVideos(pubsubEvent({ mode: "fast_recheck" }));

		expect(youtubeApi.fetchVideoDetails).not.toHaveBeenCalled();
		expect(youtubeFirestore.saveVideosToFirestore).not.toHaveBeenCalled();
	});

	it("通常runの二重実行ロック（isInProgress）を参照・更新しない（discoveryモード既定=searchのためメタデータ自体を読まない）", async () => {
		getMetadataMock.mockResolvedValue({
			exists: true,
			data: () => ({
				isInProgress: true,
				lastFetchedAt: { toMillis: () => Date.now() },
			}),
		});
		vi.mocked(youtubeFirestore.getStaleLiveVideoIds).mockResolvedValue({
			videoIds: ["live1"],
			truncated: false,
		});
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "live1" } as youtube_v3.Schema$Video,
		]);
		vi.mocked(youtubeFirestore.saveVideosToFirestore).mockResolvedValue(1);

		await fetchYouTubeVideos(pubsubEvent({ mode: "fast_recheck" }));

		// 通常runなら isInProgress=true でスキップされるが、fast_recheckは
		// 共有メタデータを更新しないため実行される（= ロック起因のupdateも発生しない）
		expect(youtubeFirestore.saveVideosToFirestore).toHaveBeenCalled();
		expect(updateMock).not.toHaveBeenCalled();
		expect(createMetadataMock).not.toHaveBeenCalled();
	});

	describe("discoveryモード=playlist時の軽量新着発見", () => {
		it("uploads playlist IDがキャッシュ済みなら新着発見してstale liveとマージする", async () => {
			process.env.YOUTUBE_DISCOVERY_MODE = "playlist";
			getMetadataMock.mockResolvedValue({
				exists: true,
				data: () => ({ uploadsPlaylistId: "UUxxxx" }),
			});
			vi.mocked(youtubeApi.fetchUploadsPlaylistPage).mockResolvedValue({
				videoIds: ["newVideo1"],
				nextPageToken: undefined,
			});
			vi.mocked(youtubeFirestore.getKnownVideoIdsSet).mockResolvedValue(new Set());
			vi.mocked(youtubeFirestore.getStaleLiveVideoIds).mockResolvedValue({
				videoIds: ["live1"],
				truncated: false,
			});
			vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
				{ id: "newVideo1" } as youtube_v3.Schema$Video,
				{ id: "live1" } as youtube_v3.Schema$Video,
			]);
			vi.mocked(youtubeFirestore.saveVideosToFirestore).mockResolvedValue(2);

			await fetchYouTubeVideos(pubsubEvent({ mode: "fast_recheck" }));

			expect(youtubeApi.fetchUploadsPlaylistPage).toHaveBeenCalledWith(
				dummyClient,
				"UUxxxx",
				undefined,
			);
			const calledIds = vi.mocked(youtubeApi.fetchVideoDetails).mock.calls[0]?.[1];
			expect(calledIds).toEqual(expect.arrayContaining(["newVideo1", "live1"]));
			expect(calledIds).toHaveLength(2);
			expect(youtubeFirestore.saveVideosToFirestore).toHaveBeenCalled();
			expect(updateMock).not.toHaveBeenCalled();
			expect(createMetadataMock).not.toHaveBeenCalled();
		});

		it("uploads playlist IDが未キャッシュなら新着発見をスキップする（メタデータは書き込まない）", async () => {
			process.env.YOUTUBE_DISCOVERY_MODE = "playlist";
			getMetadataMock.mockResolvedValue({ exists: false });
			vi.mocked(youtubeFirestore.getStaleLiveVideoIds).mockResolvedValue({
				videoIds: [],
				truncated: false,
			});

			await fetchYouTubeVideos(pubsubEvent({ mode: "fast_recheck" }));

			expect(youtubeApi.fetchUploadsPlaylistPage).not.toHaveBeenCalled();
			expect(updateMock).not.toHaveBeenCalled();
			// 所見対応: FetchMetadataドキュメントが存在しない場合でも
			// getCachedUploadsPlaylistIdは新規作成(create)しない（読み取り専用）
			expect(createMetadataMock).not.toHaveBeenCalled();
		});
	});
});

describe("fetchYouTubeVideos: playlist→videoマッピングのキャッシュ化（SPR-261/262）", () => {
	it("当日分のキャッシュがあればfetchChannelPlaylistsを呼ばず再利用する", async () => {
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue(["v1"]);
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "v1" } as youtube_v3.Schema$Video,
		]);
		vi.mocked(youtubeFirestore.saveVideosToFirestore).mockResolvedValue(1);
		vi.mocked(youtubeFirestore.getPlaylistMappingCache).mockImplementation(async () => {
			const { getJSTDate } = await import("../../services/price-history");
			return { mapping: new Map([["v1", ["タグ"]]]), updatedAtJST: getJSTDate() };
		});

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeApi.fetchChannelPlaylists).not.toHaveBeenCalled();
		expect(youtubeFirestore.savePlaylistMappingCache).not.toHaveBeenCalled();
	});

	it("当日分キャッシュでも新着動画が未反映なら当日中に再構築する（レビュー指摘対応）", async () => {
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue(["new1"]);
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "new1" } as youtube_v3.Schema$Video,
		]);
		vi.mocked(youtubeFirestore.saveVideosToFirestore).mockResolvedValue(1);
		// キャッシュは当日分だが、新着"new1"はキャッシュ構築後に発見された動画のため未反映
		vi.mocked(youtubeFirestore.getPlaylistMappingCache).mockImplementation(async () => {
			const { getJSTDate } = await import("../../services/price-history");
			return { mapping: new Map([["v1", ["タグ"]]]), updatedAtJST: getJSTDate() };
		});
		vi.mocked(youtubeApi.fetchChannelPlaylists).mockResolvedValue([]);
		vi.mocked(youtubeApi.fetchPlaylistItems).mockResolvedValue([]);

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeApi.fetchChannelPlaylists).toHaveBeenCalled();
		expect(youtubeFirestore.savePlaylistMappingCache).toHaveBeenCalled();
	});

	it("キャッシュが無ければ再構築して保存する", async () => {
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue(["v1"]);
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "v1" } as youtube_v3.Schema$Video,
		]);
		vi.mocked(youtubeFirestore.saveVideosToFirestore).mockResolvedValue(1);
		vi.mocked(youtubeFirestore.getPlaylistMappingCache).mockResolvedValue(undefined);
		vi.mocked(youtubeApi.fetchChannelPlaylists).mockResolvedValue([
			{ id: "PL1", title: "タグ", videoCount: 1, description: "", publishedAt: "" },
		]);
		vi.mocked(youtubeApi.fetchPlaylistItems).mockResolvedValue(["v1"]);

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeApi.fetchChannelPlaylists).toHaveBeenCalled();
		expect(youtubeFirestore.savePlaylistMappingCache).toHaveBeenCalledWith(
			new Map([["v1", ["タグ"]]]),
			expect.any(String),
		);
	});

	it("古いキャッシュ（updatedAtJSTが今日でない）は再構築する", async () => {
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue(["v1"]);
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "v1" } as youtube_v3.Schema$Video,
		]);
		vi.mocked(youtubeFirestore.saveVideosToFirestore).mockResolvedValue(1);
		vi.mocked(youtubeFirestore.getPlaylistMappingCache).mockResolvedValue({
			mapping: new Map([["old", ["旧タグ"]]]),
			updatedAtJST: "2000-01-01",
		});
		vi.mocked(youtubeApi.fetchChannelPlaylists).mockResolvedValue([]);
		vi.mocked(youtubeApi.fetchPlaylistItems).mockResolvedValue([]);

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeApi.fetchChannelPlaylists).toHaveBeenCalled();
		expect(youtubeFirestore.savePlaylistMappingCache).toHaveBeenCalled();
	});

	it("YOUTUBE_PLAYLIST_CACHE_ENABLED=falseの場合は毎回再取得する（旧挙動）", async () => {
		process.env.YOUTUBE_PLAYLIST_CACHE_ENABLED = "false";
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue(["v1"]);
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "v1" } as youtube_v3.Schema$Video,
		]);
		vi.mocked(youtubeFirestore.saveVideosToFirestore).mockResolvedValue(1);
		vi.mocked(youtubeApi.fetchChannelPlaylists).mockResolvedValue([]);
		vi.mocked(youtubeApi.fetchPlaylistItems).mockResolvedValue([]);

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeApi.fetchChannelPlaylists).toHaveBeenCalled();
		expect(youtubeFirestore.getPlaylistMappingCache).not.toHaveBeenCalled();
		expect(youtubeFirestore.savePlaylistMappingCache).not.toHaveBeenCalled();
	});
});

describe("fetchYouTubeVideos: 動画統計ティア差分の合流（SPR-261/262）", () => {
	it("recent/old tierのIDをfetchVideoDetails対象にマージする", async () => {
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue([]);
		vi.mocked(youtubeFirestore.getRecentTierVideoIds).mockResolvedValue(["recent1"]);
		vi.mocked(youtubeFirestore.getOldTierDueVideoIds).mockResolvedValue(["old1"]);
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([]);

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeApi.fetchVideoDetails).toHaveBeenCalledWith(
			dummyClient,
			expect.arrayContaining(["recent1", "old1"]),
		);
	});

	it("ティア差分クエリが失敗しても、run全体は失敗させない", async () => {
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue(["new1"]);
		vi.mocked(youtubeFirestore.getRecentTierVideoIds).mockRejectedValue(new Error("query failed"));
		vi.mocked(youtubeApi.fetchVideoDetails).mockResolvedValue([
			{ id: "new1" } as youtube_v3.Schema$Video,
		]);
		vi.mocked(youtubeFirestore.saveVideosToFirestore).mockResolvedValue(1);

		await fetchYouTubeVideos(pubsubEvent());

		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining("動画統計ティア差分の取得に失敗しました"),
			expect.anything(),
		);
		expect(youtubeApi.fetchVideoDetails).toHaveBeenCalledWith(dummyClient, ["new1"]);
		expect(youtubeFirestore.saveVideosToFirestore).toHaveBeenCalled();
	});

	it("YOUTUBE_STATS_TIER_REFRESH_ENABLED=falseの場合はティア差分クエリを呼ばない", async () => {
		process.env.YOUTUBE_STATS_TIER_REFRESH_ENABLED = "false";
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue([]);

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeFirestore.getRecentTierVideoIds).not.toHaveBeenCalled();
		expect(youtubeFirestore.getOldTierDueVideoIds).not.toHaveBeenCalled();
		expect(youtubeApi.fetchVideoDetails).not.toHaveBeenCalled();
	});
});

describe("fetchYouTubeVideos: Pub/Subペイロードのデコード", () => {
	it("dataが空でも通常runとして処理を続行する", async () => {
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue([]);

		await fetchYouTubeVideos(pubsubEvent());

		expect(youtubeApi.searchVideos).toHaveBeenCalled();
	});

	it("不正なJSONペイロードは安全側（通常run）にフォールバックする", async () => {
		vi.mocked(youtubeApi.searchVideos).mockResolvedValue({ items: [], nextPageToken: undefined });
		vi.mocked(youtubeApi.extractVideoIds).mockReturnValue([]);

		const event = {
			type: "test",
			data: { data: Buffer.from("not-json").toString("base64") },
		} as unknown as Parameters<typeof fetchYouTubeVideos>[0];

		await fetchYouTubeVideos(event);

		expect(youtubeApi.searchVideos).toHaveBeenCalled();
	});
});
