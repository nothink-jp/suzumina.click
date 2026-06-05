import { describe, expect, it } from "vitest";
import type { CircleDocument } from "../../types/firestore/circle";
import {
	convertToCirclePlainObject,
	convertToCirclePlainObjects,
	isCirclePlainObject,
} from "../circle-conversions";

const baseDoc = (over: Partial<CircleDocument> = {}): CircleDocument =>
	({
		circleId: "RG12345",
		name: "テストサークル",
		nameEn: "Test Circle",
		workIds: ["RJ1", "RJ2"],
		createdAt: "2024-01-01T00:00:00.000Z",
		updatedAt: "2024-02-01T00:00:00.000Z",
		...over,
	}) as CircleDocument;

describe("convertToCirclePlainObject", () => {
	it("null / undefined は null を返す", () => {
		expect(convertToCirclePlainObject(null)).toBeNull();
		expect(convertToCirclePlainObject(undefined)).toBeNull();
	});

	it("workIds の件数を workCount に反映する", () => {
		const result = convertToCirclePlainObject(baseDoc());
		expect(result?.workCount).toBe(2);
	});

	it("workIds が無い場合 workCount は 0", () => {
		const result = convertToCirclePlainObject(baseDoc({ workIds: undefined }));
		expect(result?.workCount).toBe(0);
	});

	it("文字列の日時はそのまま保持する", () => {
		const result = convertToCirclePlainObject(baseDoc());
		expect(result?.createdAt).toBe("2024-01-01T00:00:00.000Z");
	});

	it("Firestore Timestamp(toDate) は ISO 文字列に変換する", () => {
		const ts = { toDate: () => new Date("2024-03-03T00:00:00.000Z") };
		const result = convertToCirclePlainObject(baseDoc({ createdAt: ts as never }));
		expect(result?.createdAt).toBe("2024-03-03T00:00:00.000Z");
	});

	it("Date 型は ISO 文字列に変換する", () => {
		const result = convertToCirclePlainObject(
			baseDoc({ updatedAt: new Date("2024-04-04T00:00:00.000Z") as never }),
		);
		expect(result?.updatedAt).toBe("2024-04-04T00:00:00.000Z");
	});

	it("変換不能な日時は null になる", () => {
		const result = convertToCirclePlainObject(baseDoc({ createdAt: 12345 as never }));
		expect(result?.createdAt).toBeNull();
	});
});

describe("convertToCirclePlainObjects", () => {
	it("配列を変換し null を除外する", () => {
		const results = convertToCirclePlainObjects([baseDoc(), baseDoc({ circleId: "RG2" })]);
		expect(results).toHaveLength(2);
		expect(results.map((c) => c.circleId)).toEqual(["RG12345", "RG2"]);
	});
});

describe("isCirclePlainObject", () => {
	it("必須フィールドを満たすオブジェクトは true", () => {
		expect(isCirclePlainObject({ circleId: "RG1", name: "n", workCount: 3 })).toBe(true);
	});

	it("型が異なる/欠落するものは false", () => {
		expect(isCirclePlainObject(null)).toBe(false);
		expect(isCirclePlainObject({ circleId: "RG1", name: "n" })).toBe(false);
		expect(isCirclePlainObject({ circleId: 1, name: "n", workCount: 3 })).toBe(false);
	});
});
