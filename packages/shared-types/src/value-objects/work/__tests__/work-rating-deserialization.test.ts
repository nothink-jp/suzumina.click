import { describe, expect, it } from "vitest";
import { WorkRating } from "../work-rating";

describe("WorkRating.fromData", () => {
	it("データオブジェクトから生成できる", () => {
		const result = WorkRating.fromData({ stars: 4, count: 10, average: 4.2 });
		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().stars).toBe(4);
	});

	it("不正値はエラーを返す", () => {
		expect(WorkRating.fromData({ stars: 9, count: 10, average: 4 }).isErr()).toBe(true);
	});
});

describe("WorkRating.fromPlainObject", () => {
	it("オブジェクト以外はエラー", () => {
		expect(WorkRating.fromPlainObject(null).isErr()).toBe(true);
		expect(WorkRating.fromPlainObject(42).isErr()).toBe(true);
	});

	it("必須数値フィールドの型違反はエラー", () => {
		expect(WorkRating.fromPlainObject({ count: 1, average: 1 }).isErr()).toBe(true); // stars 欠落
		expect(WorkRating.fromPlainObject({ stars: 1, average: 1 }).isErr()).toBe(true); // count 欠落
		expect(WorkRating.fromPlainObject({ stars: 1, count: 1 }).isErr()).toBe(true); // average 欠落
	});

	it("reviewCount / distribution は任意（型不一致は無視され undefined 扱い）", () => {
		const result = WorkRating.fromPlainObject({
			stars: 4,
			count: 10,
			average: 4.2,
			reviewCount: "x", // 数値でない → undefined
			distribution: "y", // オブジェクトでない → undefined
		});
		expect(result.isOk()).toBe(true);
		const vo = result._unsafeUnwrap();
		expect(vo.reviewCount).toBeUndefined();
	});

	it("有効な reviewCount / distribution を取り込む", () => {
		const result = WorkRating.fromPlainObject({
			stars: 4,
			count: 10,
			average: 4.2,
			reviewCount: 8,
			distribution: { 4: 5, 5: 5 },
		});
		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().reviewCount).toBe(8);
	});
});
