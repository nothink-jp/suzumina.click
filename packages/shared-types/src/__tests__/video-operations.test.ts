import { describe, expect, it } from "vitest";
import {
	canCreateButton,
	formatDuration,
	getAgeInDays,
	getAllTags,
	getAudioButtonCount,
	getAudioButtonCreationErrorMessage,
	getDisplayTitle,
	getFormattedViewCount,
	getThumbnailUrl,
	getYouTubeUrl,
	hasAudioButtons,
	isArchived,
	isLive,
	isOlderThan,
	isPossiblyLive,
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
	it("isArchived は _computed を優先し、無ければ videoType を見る", () => {
		expect(isArchived(video({ _computed: { isArchived: true } } as never))).toBe(true);
		expect(isArchived(video({ videoType: "archived" } as never))).toBe(true);
		expect(isArchived(video({ videoType: "normal" } as never))).toBe(false);
	});

	it("isPremiere は _computed を優先し、無ければ videoType を見る", () => {
		expect(isPremiere(video({ _computed: { isPremiere: true } } as never))).toBe(true);
		expect(isPremiere(video({ videoType: "premiere" } as never))).toBe(true);
		expect(isPremiere(video())).toBe(false);
	});

	it("isLive / isUpcoming は liveBroadcastContent を見る", () => {
		expect(isLive(video({ liveBroadcastContent: "live" } as never))).toBe(true);
		expect(isLive(video({ liveBroadcastContent: "none" } as never))).toBe(false);
		expect(isUpcoming(video({ liveBroadcastContent: "upcoming" } as never))).toBe(true);
		expect(isUpcoming(video())).toBe(false);
	});

	it("isPossiblyLive は常に false", () => {
		expect(isPossiblyLive(video())).toBe(false);
	});
});

describe("canCreateButton / エラーメッセージ", () => {
	it("_computed.canCreateButton を優先する", () => {
		expect(canCreateButton(video({ _computed: { canCreateButton: true } } as never))).toBe(true);
		expect(canCreateButton(video({ _computed: { canCreateButton: false } } as never))).toBe(false);
	});

	it("_computed が無ければ archived のみ作成可", () => {
		expect(canCreateButton(video({ videoType: "archived" } as never))).toBe(true);
		expect(canCreateButton(video({ videoType: "normal" } as never))).toBe(false);
	});

	it("ライブ中・配信予定・長さ不明はエラーメッセージを返す", () => {
		expect(
			getAudioButtonCreationErrorMessage(video({ liveBroadcastContent: "live" } as never)),
		).toBe("ライブ配信中は音声ボタンを作成できません");
		expect(
			getAudioButtonCreationErrorMessage(video({ liveBroadcastContent: "upcoming" } as never)),
		).toBe("配信予定の動画には音声ボタンを作成できません");
		expect(getAudioButtonCreationErrorMessage(video({ duration: "PT0S" }))).toBe(
			"動画の長さが不明なため音声ボタンを作成できません",
		);
		expect(getAudioButtonCreationErrorMessage(video({ duration: undefined } as never))).toBe(
			"動画の長さが不明なため音声ボタンを作成できません",
		);
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
	it("getAllTags は全ソースを重複排除して結合する", () => {
		const v = video({
			tags: {
				playlistTags: ["a", "b"],
				userTags: ["b", "c"],
				contentTags: ["c", "d"],
			},
		} as never);
		expect(getAllTags(v).sort()).toEqual(["a", "b", "c", "d"]);
	});

	it("タグが無ければ空配列", () => {
		expect(getAllTags(video())).toEqual([]);
	});

	it("hasAudioButtons / getAudioButtonCount", () => {
		expect(
			hasAudioButtons(video({ audioButtonInfo: { hasButtons: true, count: 3 } } as never)),
		).toBe(true);
		expect(hasAudioButtons(video())).toBe(false);
		expect(getAudioButtonCount(video({ audioButtonInfo: { count: 3 } } as never))).toBe(3);
		expect(getAudioButtonCount(video())).toBe(0);
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
