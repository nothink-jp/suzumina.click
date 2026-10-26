import type { WorkDocument } from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import { listChangedWorkPaths } from "../work-change-paths";

const baseWork = {
	id: "RJ123456",
	productId: "RJ123456",
	title: "テスト作品",
	description: "説明",
	thumbnailUrl: "https://img.dlsite.jp/a.jpg",
	highResImageUrl: "https://img.dlsite.jp/a_main.jpg",
	price: { current: 1000, currency: "JPY" },
	rating: { stars: 4.5, count: 10, ratingDetail: [{ review_point: 5, count: 10, ratio: 100 }] },
	creators: { voice_by: [{ id: "c1", name: "声優A" }], illust_by: [] },
	genres: ["ASMR"],
	sampleImages: [{ thumb: "https://img.dlsite.jp/s1.jpg" }],
	languageDownloads: [{ workno: "RJ123456", label: "日本語", lang: "JPN", dlCount: "100" }],
	lastFetchedAt: "2026-10-01T00:00:00.000Z",
	createdAt: "2026-10-01T00:00:00.000Z",
	updatedAt: "2026-10-01T00:00:00.000Z",
} as unknown as WorkDocument;

function withOverrides(overrides: Record<string, unknown>): WorkDocument {
	return { ...baseWork, ...overrides } as WorkDocument;
}

describe("listChangedWorkPaths", () => {
	it("同一内容なら空", () => {
		expect(listChangedWorkPaths(baseWork, structuredClone(baseWork))).toEqual([]);
	});

	it("評価の星・件数の小さな変化を拾う", () => {
		const updated = withOverrides({ rating: { ...baseWork.rating, stars: 4.4, count: 11 } });
		expect(listChangedWorkPaths(baseWork, updated)).toEqual(["rating.stars", "rating.count"]);
	});

	it("作者の追加・削除を拾う", () => {
		const added = withOverrides({
			creators: { voice_by: [{ id: "c1", name: "声優A" }], illust_by: [{ id: "c2", name: "B" }] },
		});
		const removed = withOverrides({ creators: { voice_by: [], illust_by: [] } });
		expect(listChangedWorkPaths(baseWork, added)).toEqual(["creators.illust_by"]);
		expect(listChangedWorkPaths(baseWork, removed)).toEqual(["creators.voice_by"]);
	});

	it("説明・画像の変化を拾う", () => {
		const updated = withOverrides({
			description: "新しい説明",
			thumbnailUrl: "https://img.dlsite.jp/b.jpg",
			sampleImages: [],
		});
		expect(listChangedWorkPaths(baseWork, updated)).toEqual([
			"description",
			"thumbnailUrl",
			"sampleImages",
		]);
	});

	it("ジャンルの削除を拾う", () => {
		expect(listChangedWorkPaths(baseWork, withOverrides({ genres: [] }))).toEqual(["genres"]);
	});

	it("書き込み側が削除するフィールドの消失を拾う（highResImageUrl / price.discount 等）", () => {
		const existing = withOverrides({ price: { current: 800, currency: "JPY", discount: 20 } });
		const updated = withOverrides({
			highResImageUrl: undefined,
			price: { current: 800, currency: "JPY" },
		});
		expect(listChangedWorkPaths(existing, updated)).toEqual(["highResImageUrl", "price.discount"]);
	});

	it("undefined のフィールドは merge でスキップされるため変化とみなさない", () => {
		const existing = withOverrides({ titleKana: "てすと" });
		const updated = withOverrides({ titleKana: undefined, rating: undefined });
		expect(listChangedWorkPaths(existing, updated)).toEqual([]);
	});

	it("既存側にだけあるネストしたキーは merge で残るため変化とみなさない", () => {
		const existing = withOverrides({ price: { current: 1000, currency: "JPY", legacy: 1 } });
		expect(listChangedWorkPaths(existing, baseWork)).toEqual([]);
	});

	it("配列内オブジェクトの undefined キーは保存されないため無視する", () => {
		const updated = withOverrides({
			sampleImages: [{ thumb: "https://img.dlsite.jp/s1.jpg", width: undefined }],
		});
		expect(listChangedWorkPaths(baseWork, updated)).toEqual([]);
	});

	it("時刻・為替・ダウンロード数など常に動く値は無視する", () => {
		const updated = withOverrides({
			lastFetchedAt: "2026-10-26T00:00:00.000Z",
			createdAt: "2026-10-26T00:00:00.000Z",
			updatedAt: "2026-10-26T00:00:00.000Z",
			dataSources: { infoAPI: { lastFetched: "2026-10-26T00:00:00.000Z", customGenres: [] } },
			price: { current: 1000, currency: "JPY", localePrices: { USD: 6.5 } },
			languageDownloads: [{ workno: "RJ123456", label: "日本語", lang: "JPN", dlCount: "150" }],
		});
		expect(listChangedWorkPaths(baseWork, updated)).toEqual([]);
	});

	it("新しく現れたフィールドを拾う", () => {
		const existing = withOverrides({ rating: undefined });
		expect(listChangedWorkPaths(existing, baseWork)).toEqual(["rating"]);
	});
});
