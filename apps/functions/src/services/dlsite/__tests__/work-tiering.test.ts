/**
 * dlsite 作品ティア分類ユーティリティ（SPR-229）のテスト
 */

import type { WorkDocument } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import {
	classifyAndFilterStableTier,
	classifyWorkTier,
	classifyWorkTiers,
	getStableCandidateIds,
	splitStableDueByLimit,
	toDueWorkIds,
	VOLATILE_RELEASE_WINDOW_DAYS,
} from "../work-tiering";

const TODAY = new Date("2026-07-05T00:00:00.000Z");

function makeWork(overrides: Partial<WorkDocument> = {}): WorkDocument {
	return {
		productId: "RJ000000",
		releaseDateISO: "2020-01-01T00:00:00Z", // 十分に古い日付（デフォルトはstable）
		salesStatus: { isSale: false, isSoldOut: false },
		...overrides,
	} as WorkDocument;
}

describe("classifyWorkTier", () => {
	it("既存作品が存在しない場合はnewになる", () => {
		expect(classifyWorkTier(undefined, TODAY)).toBe("new");
	});

	it("salesStatus.isSale=trueの場合はvolatileになる", () => {
		const work = makeWork({ salesStatus: { isSale: true, isSoldOut: false } });
		expect(classifyWorkTier(work, TODAY)).toBe("volatile");
	});

	it("releaseDateISOが直近90日以内の場合はvolatileになる", () => {
		const work = makeWork({ releaseDateISO: "2026-06-01T00:00:00Z" }); // 34日前
		expect(classifyWorkTier(work, TODAY)).toBe("volatile");
	});

	it("releaseDateISOがちょうど閾値の場合はvolatileになる（境界値）", () => {
		const boundary = new Date(TODAY.getTime() - VOLATILE_RELEASE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
		const work = makeWork({ releaseDateISO: boundary.toISOString() });
		expect(classifyWorkTier(work, TODAY)).toBe("volatile");
	});

	it("releaseDateISOが90日超前かつisSale=falseの場合はstableになる", () => {
		const work = makeWork({ releaseDateISO: "2020-01-01T00:00:00Z" });
		expect(classifyWorkTier(work, TODAY)).toBe("stable");
	});

	it("releaseDateISO欠損の場合は安全側でvolatileになる", () => {
		const work = makeWork({ releaseDateISO: undefined });
		expect(classifyWorkTier(work, TODAY)).toBe("volatile");
	});

	it("releaseDateISOが不正な文字列の場合は安全側でvolatileになる", () => {
		const work = makeWork({ releaseDateISO: "invalid-date" });
		expect(classifyWorkTier(work, TODAY)).toBe("volatile");
	});
});

describe("classifyWorkTiers", () => {
	it("各作品IDをclassifyWorkTierと同じ結果でMapに詰める", () => {
		const existingWorksMap = new Map<string, WorkDocument>([
			["RJ001", makeWork({ productId: "RJ001" })], // stable
			["RJ002", makeWork({ productId: "RJ002", salesStatus: { isSale: true, isSoldOut: false } })], // volatile
		]);
		const workIds = ["RJ001", "RJ002", "RJ003"]; // RJ003はnew（マップ不在）

		const tiers = classifyWorkTiers(workIds, existingWorksMap, TODAY);

		expect(tiers.get("RJ001")).toBe("stable");
		expect(tiers.get("RJ002")).toBe("volatile");
		expect(tiers.get("RJ003")).toBe("new");
	});
});

describe("getStableCandidateIds", () => {
	it("stableティアの作品IDのみを返す", () => {
		const existingWorksMap = new Map<string, WorkDocument>([
			["RJ001", makeWork({ productId: "RJ001" })], // stable
			["RJ002", makeWork({ productId: "RJ002", salesStatus: { isSale: true, isSoldOut: false } })], // volatile
		]);
		const workIds = ["RJ001", "RJ002", "RJ003"]; // RJ003はnew（マップ不在）
		const tiers = classifyWorkTiers(workIds, existingWorksMap, TODAY);

		expect(getStableCandidateIds(workIds, tiers)).toEqual(["RJ001"]);
	});
});

describe("classifyAndFilterStableTier", () => {
	it("new/volatile/stable(due)/stable(skip)に正しく振り分ける", () => {
		const existingWorksMap = new Map<string, WorkDocument>([
			["RJ_STABLE_DUE", makeWork({ productId: "RJ_STABLE_DUE" })],
			["RJ_STABLE_SKIP", makeWork({ productId: "RJ_STABLE_SKIP" })],
			[
				"RJ_VOLATILE",
				makeWork({ productId: "RJ_VOLATILE", salesStatus: { isSale: true, isSoldOut: false } }),
			],
		]);
		const workIds = ["RJ_NEW", "RJ_VOLATILE", "RJ_STABLE_DUE", "RJ_STABLE_SKIP"];
		const priceHistoryTodayExists = new Set(["RJ_STABLE_SKIP"]);
		const tiers = classifyWorkTiers(workIds, existingWorksMap, TODAY);

		const result = classifyAndFilterStableTier(workIds, tiers, priceHistoryTodayExists);

		expect(result).toEqual({
			newIds: ["RJ_NEW"],
			volatileIds: ["RJ_VOLATILE"],
			stableDueIds: ["RJ_STABLE_DUE"],
			stableSkippedIds: ["RJ_STABLE_SKIP"],
		});
	});

	it("全件stableでpriceHistoryが存在しない場合、全てdueになる", () => {
		const existingWorksMap = new Map<string, WorkDocument>([
			["RJ001", makeWork({ productId: "RJ001" })],
			["RJ002", makeWork({ productId: "RJ002" })],
		]);
		const workIds = ["RJ001", "RJ002"];
		const tiers = classifyWorkTiers(workIds, existingWorksMap, TODAY);
		const result = classifyAndFilterStableTier(workIds, tiers, new Set());

		expect(result.stableDueIds).toEqual(["RJ001", "RJ002"]);
		expect(result.stableSkippedIds).toEqual([]);
	});

	it("tiersに存在しないworkIdは安全側でnew扱いになる", () => {
		const tiers = new Map<string, "new" | "volatile" | "stable">();
		const result = classifyAndFilterStableTier(["RJ_UNKNOWN"], tiers, new Set());

		expect(result.newIds).toEqual(["RJ_UNKNOWN"]);
		expect(result.stableDueIds).toEqual([]);
	});
});

describe("splitStableDueByLimit（SPR-411）", () => {
	const ids = Array.from({ length: 10 }, (_, i) => `RJ${String(i).padStart(3, "0")}`);

	it("上限以下ならそのまま全件を取得対象にする（順番も変えない）", () => {
		expect(splitStableDueByLimit(ids, 10, "2026-11-14")).toEqual({
			selectedIds: ids,
			deferredIds: [],
		});
	});

	it("上限を超えたら上限件数だけ選び、残りを繰り延べる（合わせて元の集合）", () => {
		const { selectedIds, deferredIds } = splitStableDueByLimit(ids, 4, "2026-11-14");

		expect(selectedIds).toHaveLength(4);
		expect(deferredIds).toHaveLength(6);
		expect([...selectedIds, ...deferredIds].sort()).toEqual(ids);
	});

	it("同じ日は順番が変わらない＝取得済みが抜けた分だけ先へ進み、1日で一巡する", () => {
		const first = splitStableDueByLimit(ids, 4, "2026-11-14");
		// 次のサイクル: 取得済み（priceHistory あり）は stable-due から抜けている。入力順は scrape 順
		const remaining = ids.filter((id) => !first.selectedIds.includes(id));
		const second = splitStableDueByLimit(remaining, 4, "2026-11-14");
		const third = splitStableDueByLimit(second.deferredIds, 4, "2026-11-14");

		expect(second.selectedIds).toEqual(first.deferredIds.slice(0, 4));
		expect(third.deferredIds).toEqual([]);
		expect([...first.selectedIds, ...second.selectedIds, ...third.selectedIds].sort()).toEqual(ids);
	});

	it("日付が変わると選ぶ作品が変わる（取りこぼしが毎日同じ作品に偏らない）", () => {
		const day1 = splitStableDueByLimit(ids, 4, "2026-11-14").selectedIds;
		const day2 = splitStableDueByLimit(ids, 4, "2026-11-15").selectedIds;

		expect(day1).not.toEqual(day2);
		// scrape 順の先頭から取っているわけでもない
		expect(day1).not.toEqual(ids.slice(0, 4));
	});

	it("上限が 0 以下なら全件を繰り延べる", () => {
		const { selectedIds, deferredIds } = splitStableDueByLimit(ids, -5, "2026-11-14");

		expect(selectedIds).toEqual([]);
		expect(deferredIds).toHaveLength(10);
	});
});

describe("toDueWorkIds", () => {
	it("new→volatile→stableDueの順に結合する（既存の並び順を維持）", () => {
		const tiered = {
			newIds: ["N1", "N2"],
			volatileIds: ["V1"],
			stableDueIds: ["S1", "S2"],
			stableSkippedIds: ["SKIP1"],
		};

		expect(toDueWorkIds(tiered)).toEqual(["N1", "N2", "V1", "S1", "S2"]);
	});
});
