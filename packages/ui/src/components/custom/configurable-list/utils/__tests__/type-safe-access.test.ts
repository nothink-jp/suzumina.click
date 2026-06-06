import { describe, expect, it } from "vitest";
import {
	getDateProperty,
	getFilterableValue,
	getNumericProperty,
	getSearchableText,
	getStringProperty,
} from "../type-safe-access";

describe("getSearchableText", () => {
	it("オブジェクト以外は null", () => {
		expect(getSearchableText(null)).toBeNull();
		expect(getSearchableText("x")).toBeNull();
	});
	it("一般的なプロパティを優先順で返す", () => {
		expect(getSearchableText({ title: "T" })).toBe("T");
		expect(getSearchableText({ description: "D" })).toBe("D");
	});
	it("ネストした data も探索する", () => {
		expect(getSearchableText({ data: { name: "N" } })).toBe("N");
	});
	it("該当なしは null", () => {
		expect(getSearchableText({ foo: 1 })).toBeNull();
	});
});

describe("getDateProperty", () => {
	it("Date / 文字列 / Firestore Timestamp をパースする", () => {
		const d = new Date("2024-01-01T00:00:00.000Z");
		expect(getDateProperty({ createdAt: d })).toEqual(d);
		expect(getDateProperty({ updatedAt: "2024-02-02T00:00:00.000Z" })?.toISOString()).toBe(
			"2024-02-02T00:00:00.000Z",
		);
		expect(getDateProperty({ date: { toDate: () => d } })).toEqual(d);
	});
	it("無効文字列・該当なし・非オブジェクトは null", () => {
		expect(getDateProperty({ createdAt: "not-a-date" })).toBeNull();
		expect(getDateProperty({ foo: 1 })).toBeNull();
		expect(getDateProperty(42)).toBeNull();
	});
	it("ネストした data も探索する", () => {
		expect(getDateProperty({ data: { date: "2024-03-03T00:00:00.000Z" } })).not.toBeNull();
	});
});

describe("getNumericProperty", () => {
	it("数値・数値文字列をパース、パスを辿る", () => {
		expect(getNumericProperty({ a: 5 }, "a")).toBe(5);
		expect(getNumericProperty({ a: "5.5" }, "a")).toBe(5.5);
		expect(getNumericProperty({ a: { b: 3 } }, "a.b")).toBe(3);
	});
	it("欠落・非数値・非オブジェクトは null", () => {
		expect(getNumericProperty({ a: { b: 1 } }, "a.c")).toBeNull();
		expect(getNumericProperty({ a: "x" }, "a")).toBeNull();
		expect(getNumericProperty(null, "a")).toBeNull();
	});
});

describe("getStringProperty", () => {
	it("文字列・toString 可能な値を返す", () => {
		expect(getStringProperty({ a: "s" }, "a")).toBe("s");
		expect(getStringProperty({ a: 42 }, "a")).toBe("42");
	});
	it("欠落・非オブジェクトは null", () => {
		expect(getStringProperty({ a: {} }, "a.b")).toBeNull();
		expect(getStringProperty(null, "a")).toBeNull();
	});
});

describe("getFilterableValue", () => {
	it("プロパティパスを辿って値を返す", () => {
		expect(getFilterableValue({ a: { b: "v" } }, "a.b")).toBe("v");
	});
	it("非オブジェクト・途中 null は undefined", () => {
		expect(getFilterableValue(null, "a")).toBeUndefined();
		expect(getFilterableValue({ a: null }, "a.b")).toBeUndefined();
	});
});
