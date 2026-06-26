/**
 * 作品処理順ユーティリティ（SPR-225 Stage 3a）のテスト
 */

import { describe, expect, it } from "vitest";
import { orderNewWorksFirst } from "../work-ordering";

describe("orderNewWorksFirst", () => {
	it("新作（known に無い）を先頭へ、既存作を後ろへ並べ替える", () => {
		const workIds = ["RJ001", "RJ002", "RJ003", "RJ004"];
		const known = new Set(["RJ001", "RJ003"]);

		const { ordered, newCount } = orderNewWorksFirst(workIds, known);

		expect(ordered).toEqual(["RJ002", "RJ004", "RJ001", "RJ003"]);
		expect(newCount).toBe(2);
	});

	it("各グループ内の相対順（scrape 順）を保つ", () => {
		const workIds = ["A", "B", "C", "D", "E"];
		const known = new Set(["B", "D"]);

		const { ordered } = orderNewWorksFirst(workIds, known);

		expect(ordered).toEqual(["A", "C", "E", "B", "D"]);
	});

	it("新作が無い場合は順序を変えない", () => {
		const workIds = ["RJ001", "RJ002"];
		const known = new Set(["RJ001", "RJ002"]);

		const { ordered, newCount } = orderNewWorksFirst(workIds, known);

		expect(ordered).toEqual(["RJ001", "RJ002"]);
		expect(newCount).toBe(0);
	});

	it("全件新作の場合は順序を変えない（全て先頭グループ）", () => {
		const workIds = ["RJ001", "RJ002"];
		const known = new Set<string>();

		const { ordered, newCount } = orderNewWorksFirst(workIds, known);

		expect(ordered).toEqual(["RJ001", "RJ002"]);
		expect(newCount).toBe(2);
	});

	it("Map（existingWorksMap）も known として受け付ける", () => {
		const workIds = ["RJ001", "RJ002", "RJ003"];
		const known = new Map<string, unknown>([["RJ002", {}]]);

		const { ordered, newCount } = orderNewWorksFirst(workIds, known);

		expect(ordered).toEqual(["RJ001", "RJ003", "RJ002"]);
		expect(newCount).toBe(2);
	});
});
