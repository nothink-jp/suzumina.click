import type { WorkDocument } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { calculateSimilarityScore } from "../work-similarity";

const work = (over: Partial<WorkDocument>): WorkDocument => over as WorkDocument;

const base = work({
	circle: "C1",
	category: "SOU",
	creators: { voice_by: [{ name: "声優A" }, { name: "声優B" }] } as never,
	genres: ["癒し", "ASMR"],
	price: { current: 1000 } as never,
});

describe("calculateSimilarityScore", () => {
	it("サークル一致で +10（byCircle 有効時のみ）", () => {
		expect(calculateSimilarityScore(work({ circle: "C1" }), base, true, false, false)).toBe(10);
		expect(calculateSimilarityScore(work({ circle: "C1" }), base, false, false, false)).toBe(0);
	});

	it("声優の共通数 × 3（完全一致）", () => {
		const w = work({ creators: { voice_by: [{ name: "声優A" }] } as never });
		expect(calculateSimilarityScore(w, base, false, true, false)).toBe(3);
	});

	it("声優は部分一致（includes）でも加点される", () => {
		// base「フルネーム太郎」、work「太郎」→ includes でマッチ（1名 × 3）。
		// category を base 側のみ設定し、未指定同士の category 一致(+1)を避ける。
		const singleBase = work({
			category: "SOU",
			creators: { voice_by: [{ name: "フルネーム太郎" }] } as never,
		});
		const w = work({ category: "GAM", creators: { voice_by: [{ name: "太郎" }] } as never });
		expect(calculateSimilarityScore(w, singleBase, false, true, false)).toBe(3);
	});

	it("ジャンルの共通数 × 2", () => {
		const w = work({ genres: ["癒し"] });
		expect(calculateSimilarityScore(w, base, false, false, true)).toBe(2);
	});

	it("カテゴリ一致で +1", () => {
		expect(calculateSimilarityScore(work({ category: "SOU" }), base, false, false, false)).toBe(1);
	});

	it("価格差 500 未満で +1", () => {
		const near = work({ price: { current: 1200 } as never });
		const far = work({ price: { current: 5000 } as never });
		expect(calculateSimilarityScore(near, base, false, false, false)).toBe(1);
		expect(calculateSimilarityScore(far, base, false, false, false)).toBe(0);
	});

	it("複合条件のスコアを合算する", () => {
		const w = work({
			circle: "C1",
			category: "SOU",
			creators: { voice_by: [{ name: "声優A" }, { name: "声優B" }] } as never,
			genres: ["癒し", "ASMR"],
			price: { current: 1000 } as never,
		});
		// circle10 + voice(2*3=6) + genre(2*2=4) + category1 + price1 = 22
		expect(calculateSimilarityScore(w, base, true, true, true)).toBe(22);
	});
});
