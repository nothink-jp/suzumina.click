import { describe, expect, it } from "vitest";
import { formatTimestamp, parseDurationToSeconds } from "../time-format";

describe("formatTimestamp", () => {
	it("1時間未満は mm:ss.t 形式", () => {
		// 小数第1位は floor((sec%1)*10)。FP 誤差を避け 0.5 刻みで検証
		expect(formatTimestamp(75.5)).toBe("1:15.5");
		expect(formatTimestamp(5)).toBe("0:05.0");
	});

	it("1時間以上は hh:mm:ss.t 形式（分秒は0埋め）", () => {
		expect(formatTimestamp(3661.5)).toBe("1:01:01.5");
	});
});

describe("parseDurationToSeconds", () => {
	it("ISO 8601 duration を秒に変換する", () => {
		expect(parseDurationToSeconds("PT1H23M45S")).toBe(1 * 3600 + 23 * 60 + 45);
		expect(parseDurationToSeconds("PT5M30S")).toBe(330);
		expect(parseDurationToSeconds("PT45S")).toBe(45);
	});

	it("空・不正入力は 0 を返す", () => {
		expect(parseDurationToSeconds(undefined)).toBe(0);
		expect(parseDurationToSeconds("")).toBe(0);
		expect(parseDurationToSeconds("not-a-duration")).toBe(0);
	});
});
