import { describe, expect, it } from "vitest";
import { calculatePagination } from "../data-adapter";

describe("calculatePagination", () => {
	it("総ページ数・前後フラグ・インデックスを算出する", () => {
		expect(calculatePagination(25, 10, 1)).toEqual({
			totalPages: 3,
			hasNext: true,
			hasPrev: false,
			startIndex: 0,
			endIndex: 10,
		});
		expect(calculatePagination(25, 10, 3)).toEqual({
			totalPages: 3,
			hasNext: false,
			hasPrev: true,
			startIndex: 20,
			endIndex: 25,
		});
	});
});
