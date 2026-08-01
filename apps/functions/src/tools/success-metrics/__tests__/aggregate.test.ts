import { describe, expect, it } from "vitest";
import {
	type ActivityRecord,
	type ButtonRecord,
	detectCreationSessions,
	median,
	parseTimestamp,
	summarizeCreationByMonth,
	summarizeEffort,
	summarizeEffortByMonth,
	summarizeMonthlyActiveUsers,
	summarizePlayback,
	summarizeUserActivity,
	toJstDateKey,
	toJstMonthKey,
} from "../aggregate";

function button(overrides: Partial<ButtonRecord> & { createdAt: Date }): ButtonRecord {
	return {
		id: "b1",
		creatorId: "u1",
		creatorName: "creator",
		playCount: 0,
		likeCount: 0,
		favoriteCount: 0,
		videoId: "v1",
		...overrides,
	};
}

describe("parseTimestamp", () => {
	it("ISO string を Date にする", () => {
		expect(parseTimestamp("2026-07-31T11:09:04.384Z")?.toISOString()).toBe(
			"2026-07-31T11:09:04.384Z",
		);
	});

	it("Firestore Timestamp（toDate を持つ）を Date にする", () => {
		const timestamp = { toDate: () => new Date("2026-07-01T00:00:00.000Z") };
		expect(parseTimestamp(timestamp)?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
	});

	it("シリアライズされた Timestamp（_seconds）を Date にする", () => {
		expect(parseTimestamp({ _seconds: 1753096381, _nanoseconds: 161000000 })?.toISOString()).toBe(
			new Date(1753096381000).toISOString(),
		);
	});

	it("Date をそのまま通す", () => {
		const date = new Date("2026-01-01T00:00:00.000Z");
		expect(parseTimestamp(date)).toBe(date);
	});

	it("解釈できない値は null（黙って現在時刻にしない）", () => {
		expect(parseTimestamp(undefined)).toBeNull();
		expect(parseTimestamp(null)).toBeNull();
		expect(parseTimestamp("not a date")).toBeNull();
		expect(parseTimestamp(new Date("invalid"))).toBeNull();
		expect(parseTimestamp({})).toBeNull();
		expect(parseTimestamp(123)).toBeNull();
	});
});

describe("JST キー", () => {
	it("UTC 15:00 は翌日の JST 日付になる", () => {
		expect(toJstDateKey(new Date("2026-07-31T15:00:00.000Z"))).toBe("2026-08-01");
		expect(toJstMonthKey(new Date("2026-07-31T15:00:00.000Z"))).toBe("2026-08");
	});

	it("UTC 14:59 は同日の JST 日付のまま", () => {
		expect(toJstDateKey(new Date("2026-07-31T14:59:00.000Z"))).toBe("2026-07-31");
	});
});

describe("median", () => {
	it("奇数個は中央の値", () => {
		expect(median([3, 1, 2])).toBe(2);
	});

	it("偶数個は中央2つの平均", () => {
		expect(median([1, 2, 3, 4])).toBe(2.5);
	});

	it("空配列は null", () => {
		expect(median([])).toBeNull();
	});
});

describe("detectCreationSessions", () => {
	it("間隔が閾値未満なら同一セッションにまとめる", () => {
		const sessions = detectCreationSessions(
			[
				button({ id: "a", createdAt: new Date("2026-07-01T10:00:00Z") }),
				button({ id: "b", createdAt: new Date("2026-07-01T10:05:00Z") }),
				button({ id: "c", createdAt: new Date("2026-07-01T10:12:00Z") }),
			],
			30,
		);
		expect(sessions).toHaveLength(1);
		expect(sessions[0]?.buttonCount).toBe(3);
		expect(sessions[0]?.intervalsSeconds).toEqual([300, 420]);
	});

	it("間隔が閾値以上なら別セッションに割る", () => {
		const sessions = detectCreationSessions(
			[
				button({ id: "a", createdAt: new Date("2026-07-01T10:00:00Z") }),
				button({ id: "b", createdAt: new Date("2026-07-01T11:00:00Z") }),
			],
			30,
		);
		expect(sessions).toHaveLength(2);
		expect(sessions.every((s) => s.buttonCount === 1)).toBe(true);
	});

	it("creator が違えば時間が近くても混ざらない", () => {
		const sessions = detectCreationSessions(
			[
				button({ id: "a", creatorId: "u1", createdAt: new Date("2026-07-01T10:00:00Z") }),
				button({ id: "b", creatorId: "u2", createdAt: new Date("2026-07-01T10:01:00Z") }),
			],
			30,
		);
		expect(sessions).toHaveLength(2);
		expect(sessions.map((s) => s.creatorId).sort()).toEqual(["u1", "u2"]);
	});

	it("入力順が時系列でなくてもセッション化できる", () => {
		const sessions = detectCreationSessions(
			[
				button({ id: "c", createdAt: new Date("2026-07-01T10:12:00Z") }),
				button({ id: "a", createdAt: new Date("2026-07-01T10:00:00Z") }),
				button({ id: "b", createdAt: new Date("2026-07-01T10:05:00Z") }),
			],
			30,
		);
		expect(sessions).toHaveLength(1);
		expect(sessions[0]?.intervalsSeconds).toEqual([300, 420]);
	});

	it("空入力は空配列", () => {
		expect(detectCreationSessions([], 30)).toEqual([]);
	});
});

describe("summarizeEffort", () => {
	it("セッションあたり作成数と間隔の中央値を出す", () => {
		const sessions = detectCreationSessions(
			[
				button({ id: "a", createdAt: new Date("2026-07-01T10:00:00Z") }),
				button({ id: "b", createdAt: new Date("2026-07-01T10:02:00Z") }),
				button({ id: "c", createdAt: new Date("2026-07-01T10:10:00Z") }),
				button({ id: "d", createdAt: new Date("2026-07-02T10:00:00Z") }),
			],
			30,
		);
		const summary = summarizeEffort(sessions);
		expect(summary.sessions).toBe(2);
		expect(summary.buttons).toBe(4);
		expect(summary.buttonsPerSession).toBe(2);
		expect(summary.medianIntervalSeconds).toBe(300); // 間隔 120秒 と 480秒 の中央値
	});

	it("単独作成だけなら間隔は null", () => {
		const sessions = detectCreationSessions(
			[button({ id: "a", createdAt: new Date("2026-07-01T10:00:00Z") })],
			30,
		);
		expect(summarizeEffort(sessions).medianIntervalSeconds).toBeNull();
	});

	it("セッションが無ければ 0 で割らない", () => {
		expect(summarizeEffort([])).toEqual({
			sessions: 0,
			buttons: 0,
			buttonsPerSession: 0,
			medianIntervalSeconds: null,
		});
	});
});

describe("summarizeEffortByMonth", () => {
	it("セッション開始月で束ねて月順に返す", () => {
		const sessions = detectCreationSessions(
			[
				button({ id: "a", createdAt: new Date("2026-06-10T01:00:00Z") }),
				button({ id: "b", createdAt: new Date("2026-07-10T01:00:00Z") }),
				button({ id: "c", createdAt: new Date("2026-07-10T01:05:00Z") }),
			],
			30,
		);
		const rows = summarizeEffortByMonth(sessions);
		expect(rows.map((r) => r.month)).toEqual(["2026-06", "2026-07"]);
		expect(rows[1]?.buttons).toBe(2);
	});
});

describe("summarizeCreationByMonth", () => {
	it("月ごとの作成数・ユニーク作成者数・作成日数を出す", () => {
		const rows = summarizeCreationByMonth([
			button({ id: "a", creatorId: "u1", createdAt: new Date("2026-07-01T01:00:00Z") }),
			button({ id: "b", creatorId: "u2", createdAt: new Date("2026-07-02T01:00:00Z") }),
			button({ id: "c", creatorId: "u1", createdAt: new Date("2026-07-03T01:00:00Z") }),
			button({ id: "d", creatorId: "u1", createdAt: new Date("2026-08-01T01:00:00Z") }),
		]);
		expect(rows).toEqual([
			{ month: "2026-07", buttons: 3, creators: 2, days: 3 },
			{ month: "2026-08", buttons: 1, creators: 1, days: 1 },
		]);
	});

	it("同日に複数作っても作成日数は 1 日（作成数とは独立に数える）", () => {
		const rows = summarizeCreationByMonth([
			button({ id: "a", createdAt: new Date("2026-07-01T01:00:00Z") }),
			button({ id: "b", createdAt: new Date("2026-07-01T09:00:00Z") }),
		]);
		expect(rows).toEqual([{ month: "2026-07", buttons: 2, creators: 1, days: 1 }]);
	});
});

describe("summarizeUserActivity", () => {
	const activities: ActivityRecord[] = [
		{ userId: "u1", at: new Date("2026-07-01T01:00:00Z"), kind: "create" },
		{ userId: "u1", at: new Date("2026-07-01T02:00:00Z"), kind: "favorite" },
		{ userId: "u1", at: new Date("2026-08-05T01:00:00Z"), kind: "draft" },
		{ userId: "u2", at: new Date("2026-07-02T01:00:00Z"), kind: "like" },
	];

	it("同日の複数行動は活動日 1 日として数える", () => {
		const [first] = summarizeUserActivity(activities);
		expect(first?.userId).toBe("u1");
		expect(first?.activeDays).toBe(2);
		expect(first?.activeMonths).toBe(2);
	});

	it("種別ごとの件数と初回・最終を出す", () => {
		const [first] = summarizeUserActivity(activities);
		expect(first?.counts).toEqual({
			create: 1,
			favorite: 1,
			like: 0,
			dislike: 0,
			draft: 1,
			evaluation: 0,
		});
		expect(first?.firstAt.toISOString()).toBe("2026-07-01T01:00:00.000Z");
		expect(first?.lastAt.toISOString()).toBe("2026-08-05T01:00:00.000Z");
	});

	it("活動日数の多い順に並ぶ", () => {
		expect(summarizeUserActivity(activities).map((u) => u.userId)).toEqual(["u1", "u2"]);
	});
});

describe("summarizeMonthlyActiveUsers", () => {
	it("活動ユーザーと、うち作成した人を分けて数える", () => {
		const rows = summarizeMonthlyActiveUsers([
			{ userId: "u1", at: new Date("2026-07-01T01:00:00Z"), kind: "create" },
			{ userId: "u2", at: new Date("2026-07-02T01:00:00Z"), kind: "favorite" },
			{ userId: "u2", at: new Date("2026-07-03T01:00:00Z"), kind: "like" },
		]);
		expect(rows).toEqual([{ month: "2026-07", users: 2, creators: 1 }]);
	});
});

describe("summarizePlayback", () => {
	it("合計・平均・中央値・0再生数を出す", () => {
		const summary = summarizePlayback([
			button({ id: "a", playCount: 0, createdAt: new Date("2026-07-01T01:00:00Z") }),
			button({ id: "b", playCount: 10, createdAt: new Date("2026-07-01T01:00:00Z") }),
			button({ id: "c", playCount: 50, createdAt: new Date("2026-07-01T01:00:00Z") }),
		]);
		expect(summary).toEqual({
			buttons: 3,
			totalPlays: 60,
			meanPlays: 20,
			medianPlays: 10,
			zeroPlayButtons: 1,
			maxPlays: 50,
		});
	});

	it("空入力でも 0 で割らない", () => {
		expect(summarizePlayback([])).toEqual({
			buttons: 0,
			totalPlays: 0,
			meanPlays: 0,
			medianPlays: 0,
			zeroPlayButtons: 0,
			maxPlays: 0,
		});
	});
});
