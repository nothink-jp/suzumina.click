import { describe, expect, it } from "vitest";
import { formatMemberSince, formatRelativeTime } from "../formatters/relative-time";

const ago = (ms: number): string => new Date(Date.now() - ms).toISOString();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
	it("1分以内は『たった今』", () => {
		expect(formatRelativeTime(ago(30 * 1000))).toBe("たった今");
		expect(formatRelativeTime(ago(MIN))).toBe("たった今");
	});

	it("数分前は『N分前』", () => {
		expect(formatRelativeTime(ago(5 * MIN))).toBe("5分前");
	});

	it("数時間前は『N時間前』", () => {
		expect(formatRelativeTime(ago(3 * HOUR))).toBe("3時間前");
	});

	it("1日前は『昨日』", () => {
		expect(formatRelativeTime(ago(DAY + HOUR))).toBe("昨日");
	});

	it("1週間未満は『N日前』", () => {
		expect(formatRelativeTime(ago(3 * DAY))).toBe("3日前");
	});

	it("1ヶ月未満は『N週間前』", () => {
		expect(formatRelativeTime(ago(10 * DAY))).toBe("1週間前");
	});

	it("1年未満は『Nヶ月前』", () => {
		expect(formatRelativeTime(ago(60 * DAY))).toBe("2ヶ月前");
	});

	it("1年以上は『N年前』", () => {
		expect(formatRelativeTime(ago(400 * DAY))).toBe("1年前");
	});
});

describe("formatMemberSince", () => {
	it("年月を日本語表記で返す", () => {
		expect(formatMemberSince("2020-03-15T00:00:00.000Z")).toBe("2020年3月から");
	});

	it("月は 1 始まりで返す", () => {
		expect(formatMemberSince("2023-12-01T12:00:00.000Z")).toBe("2023年12月から");
	});
});
