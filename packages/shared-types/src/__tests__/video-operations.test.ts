import { describe, expect, it } from "vitest";
import {
	canCreateButton,
	formatDuration,
	getAgeInDays,
	getAllTags,
	getAudioButtonCreationErrorMessage,
	getDisplayTitle,
	getFormattedViewCount,
	getThumbnailUrl,
	getYouTubeUrl,
	isArchived,
	isLive,
	isOlderThan,
	isPremiere,
	isUpcoming,
} from "../operations/video";
import type { VideoPlainObject } from "../plain-objects/video-plain";

const video = (over: Partial<VideoPlainObject> = {}): VideoPlainObject =>
	({
		videoId: "vid123",
		title: "テスト動画",
		publishedAt: "2024-01-01T00:00:00.000Z",
		duration: "PT1M30S",
		...over,
	}) as VideoPlainObject;

describe("状態判定", () => {
	it("isArchived は _computed を優先し、無ければ正本の判定関数で算出する（保存済み videoType は見ない）", () => {
		expect(isArchived(video({ _computed: { isArchived: true } } as never))).toBe(true);
		expect(
			isArchived(
				video({
					duration: "PT1H",
					liveStreamingDetails: { actualEndTime: "2024-01-01T02:00:00.000Z" },
				} as never),
			),
		).toBe(true);
		expect(isArchived(video({ videoType: "archived" } as never))).toBe(false);
	});

	it("isPremiere は _computed を優先し、無ければ正本の判定関数で算出する", () => {
		expect(isPremiere(video({ _computed: { isPremiere: true } } as never))).toBe(true);
		expect(
			isPremiere(
				video({
					duration: "PT5M",
					liveStreamingDetails: { actualEndTime: "2024-01-01T02:00:00.000Z" },
				} as never),
			),
		).toBe(true);
		expect(isPremiere(video({ videoType: "premiere" } as never))).toBe(false);
	});

	it("isLive は _computed.videoType が live / possibly_live、isUpcoming は upcoming", () => {
		const typed = (videoType: string) => video({ _computed: { videoType } } as never);
		expect(isLive(typed("live"))).toBe(true);
		expect(isLive(typed("possibly_live"))).toBe(true);
		expect(isLive(typed("archived"))).toBe(false);
		expect(isUpcoming(typed("upcoming"))).toBe(true);
		expect(isUpcoming(typed("possibly_live"))).toBe(false);
	});

	it("取得時点の liveBroadcastContent が残っていても videoType を優先する（SPR-403）", () => {
		const stale = video({
			liveBroadcastContent: "upcoming",
			_computed: { videoType: "possibly_live" },
		} as never);
		expect(isUpcoming(stale)).toBe(false);
		expect(isLive(stale)).toBe(true);
		expect(isLive(video({ liveBroadcastContent: "live" } as never))).toBe(false);
	});

	it("_computed が無ければ正本の判定関数で算出する（保存済み videoType は見ない）", () => {
		const raw = video({
			videoType: "upcoming",
			liveStreamingDetails: { actualStartTime: "2024-01-01T00:00:00.000Z" },
		} as never);
		expect(isLive(raw)).toBe(true);
		expect(isUpcoming(raw)).toBe(false);
	});
});

describe("canCreateButton / エラーメッセージ", () => {
	it("_computed.canCreateButton を優先する", () => {
		expect(canCreateButton(video({ _computed: { canCreateButton: true } } as never))).toBe(true);
		expect(canCreateButton(video({ _computed: { canCreateButton: false } } as never))).toBe(false);
	});

	it("_computed が無ければ archived（正本の判定関数で算出）のみ作成可", () => {
		expect(
			canCreateButton(
				video({
					duration: "PT1H",
					liveStreamingDetails: { actualEndTime: "2024-01-01T02:00:00.000Z" },
				} as never),
			),
		).toBe(true);
		expect(canCreateButton(video())).toBe(false);
	});

	it("ライブ中・配信中（推定）・配信予定・長さ不明はエラーメッセージを返す", () => {
		const typed = (videoType: string) => video({ _computed: { videoType } } as never);
		expect(getAudioButtonCreationErrorMessage(typed("live"))).toBe(
			"ライブ配信中は音声ボタンを作成できません",
		);
		expect(getAudioButtonCreationErrorMessage(typed("possibly_live"))).toBe(
			"配信中の可能性があるため、アーカイブが公開されるまで音声ボタンを作成できません",
		);
		expect(getAudioButtonCreationErrorMessage(typed("upcoming"))).toBe(
			"配信予定の動画には音声ボタンを作成できません",
		);
		expect(getAudioButtonCreationErrorMessage(video({ duration: "PT0S" }))).toBe(
			"動画の長さが不明なため音声ボタンを作成できません",
		);
		expect(getAudioButtonCreationErrorMessage(video({ duration: undefined } as never))).toBe(
			"動画の長さが不明なため音声ボタンを作成できません",
		);
	});

	it("stale な liveBroadcastContent では配信系の文言を出さない（SPR-403）", () => {
		expect(
			getAudioButtonCreationErrorMessage(
				video({ liveBroadcastContent: "live", _computed: { videoType: "normal" } } as never),
			),
		).toBeNull();
	});

	it("条件を満たせば null（作成可）", () => {
		expect(getAudioButtonCreationErrorMessage(video())).toBeNull();
	});
});

describe("表示系", () => {
	it("getDisplayTitle / getYouTubeUrl", () => {
		expect(getDisplayTitle(video({ title: "タイトル" }))).toBe("タイトル");
		expect(getYouTubeUrl(video({ videoId: "abc" }))).toBe("https://www.youtube.com/watch?v=abc");
	});

	it("getThumbnailUrl は指定品質→フォールバック→構築 URL の順", () => {
		const withThumb = video({
			thumbnails: { high: { url: "http://h.jpg" } },
		} as never);
		expect(getThumbnailUrl(withThumb, "high")).toBe("http://h.jpg");
		// medium 指定だが medium が無いので fallback で high
		expect(getThumbnailUrl(withThumb, "medium")).toBe("http://h.jpg");
		// thumbnails 無し → 構築 URL
		expect(getThumbnailUrl(video({ videoId: "zzz" }))).toBe(
			"https://i.ytimg.com/vi/zzz/mqdefault.jpg",
		);
	});

	it("getFormattedViewCount は1万以上で『万』表記", () => {
		expect(getFormattedViewCount(video({ statistics: { viewCount: 12345 } } as never))).toBe(
			"1.2万",
		);
		expect(getFormattedViewCount(video({ statistics: { viewCount: 999 } } as never))).toBe("999");
		expect(getFormattedViewCount(video())).toBe("0");
	});
});

describe("formatDuration", () => {
	it("時・分・秒を整形する", () => {
		expect(formatDuration("PT1H2M3S")).toBe("1:02:03");
		expect(formatDuration("PT5M9S")).toBe("5:09");
		expect(formatDuration("PT0S")).toBe("0:00");
	});

	it("不正な形式は 0:00", () => {
		expect(formatDuration("invalid")).toBe("0:00");
	});
});

describe("tags / audio buttons", () => {
	it("getAllTags は playlistTags と contentTags を重複排除して結合する", () => {
		const v = video({
			tags: {
				playlistTags: ["a", "b"],
				contentTags: ["b", "c"],
			},
		} as never);
		expect(getAllTags(v).sort()).toEqual(["a", "b", "c"]);
	});

	it("getAllTags は userTags を集約しない（SPR-276 で撤去・書き手が残っていない）", () => {
		const v = video({
			tags: {
				playlistTags: ["a"],
				userTags: ["残骸"],
				contentTags: [],
			},
		} as never);
		expect(getAllTags(v)).toEqual(["a"]);
	});

	it("タグが無ければ空配列", () => {
		expect(getAllTags(video())).toEqual([]);
	});
});

describe("日付系", () => {
	it("isOlderThan は指定日数より古いか判定する", () => {
		expect(isOlderThan(video({ publishedAt: "2000-01-01T00:00:00.000Z" }), 30)).toBe(true);
		const recent = new Date().toISOString();
		expect(isOlderThan(video({ publishedAt: recent }), 30)).toBe(false);
	});

	it("getAgeInDays は公開からの経過日数を返す", () => {
		const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
		// 実装は Math.ceil のため、生成〜計測の僅差で 11 になり得る（境界フレーキー回避）
		const age = getAgeInDays(video({ publishedAt: tenDaysAgo }));
		expect(age).toBeGreaterThanOrEqual(10);
		expect(age).toBeLessThanOrEqual(11);
	});
});
