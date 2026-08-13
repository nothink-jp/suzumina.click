import { describe, expect, it } from "vitest";
import { getPaginationPages } from "../pagination-pages";

/**
 * リンクを辿って全ページに到達するのに必要な最大ホップ数。
 * クローラが末端ページを発見できるかを決める値で、この関数の存在理由そのもの（SPR-308）。
 */
const maxHops = (totalPages: number): number => {
	const seen = new Map([[1, 0]]);
	const queue = [1];
	while (queue.length > 0) {
		const page = queue.shift() as number;
		const depth = seen.get(page) as number;
		for (const next of getPaginationPages(page, totalPages)) {
			if (!seen.has(next)) {
				seen.set(next, depth + 1);
				queue.push(next);
			}
		}
	}
	expect(seen.size).toBe(totalPages); // 到達できないページがあってはならない
	return Math.max(...seen.values());
};

describe("getPaginationPages", () => {
	it("総ページ数が窓に収まるときは全ページを出す", () => {
		expect(getPaginationPages(1, 4)).toEqual([1, 2, 3, 4]);
		expect(getPaginationPages(3, 5)).toEqual([1, 2, 3, 4, 5]);
	});

	it("先頭・末尾・現在ページの窓を必ず含む", () => {
		const pages = getPaginationPages(10, 33);
		expect(pages).toContain(1);
		expect(pages).toContain(33);
		expect(pages).toEqual(expect.arrayContaining([8, 9, 10, 11, 12]));
	});

	it("省略区間の中間ページへのリンクを足す", () => {
		// 1 と 8 の間、12 と 33 の間がそれぞれ飛ばされるので、その中間を出す
		expect(getPaginationPages(10, 33)).toEqual([1, 4, 8, 9, 10, 11, 12, 23, 33]);
	});

	it("昇順・重複なしで返す", () => {
		const pages = getPaginationPages(50, 181);
		expect([...pages].sort((a, b) => a - b)).toEqual(pages);
		expect(new Set(pages).size).toBe(pages.length);
	});

	it("ページが無い/1ページだけの場合", () => {
		expect(getPaginationPages(1, 0)).toEqual([]);
		expect(getPaginationPages(1, 1)).toEqual([1]);
	});

	// ここが本題。中間リンクが無いと 181 ページで 45 ホップ必要になり、末端は事実上発見されない
	it("到達深度が O(log n) に収まる", () => {
		expect(maxHops(33)).toBeLessThanOrEqual(4);
		expect(maxHops(99)).toBeLessThanOrEqual(5);
		expect(maxHops(181)).toBeLessThanOrEqual(6);
		expect(maxHops(1000)).toBeLessThanOrEqual(9);
	});
});
