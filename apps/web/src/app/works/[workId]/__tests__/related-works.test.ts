import { describe, expect, it } from "vitest";
import { pickRelatedWorks, RELATED_WORKS_LIMIT } from "../related-works";

describe("pickRelatedWorks", () => {
	const ids = (n: number) => Array.from({ length: n }, (_, i) => `RJ${i + 1}`);

	it("自分自身を除外する", () => {
		expect(pickRelatedWorks(["RJ1", "RJ2", "RJ3"], "RJ2")).not.toContain("RJ2");
	});

	// 上限は表示件数であると同時に読み取りコストの上限（#917 の全件スキャン再発防止）
	it("上限を超えて返さない", () => {
		expect(pickRelatedWorks(ids(100), "RJ1")).toHaveLength(RELATED_WORKS_LIMIT);
	});

	it("末尾（新しい側）から新しい順に返す", () => {
		expect(pickRelatedWorks(ids(8), "RJ1")).toEqual(["RJ8", "RJ7", "RJ6", "RJ5", "RJ4", "RJ3"]);
	});

	it("自分以外が無ければ空（セクションごと出さないため）", () => {
		expect(pickRelatedWorks(["RJ1"], "RJ1")).toEqual([]);
		expect(pickRelatedWorks([], "RJ1")).toEqual([]);
	});
});
