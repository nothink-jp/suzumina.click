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
