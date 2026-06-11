import type { WorkDocument } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as logger from "@/lib/logger";
import {
	convertDocsToWorks,
	convertWorksToPlainObjects,
	parseWorkDocument,
} from "../work-converters";

vi.mock("@/lib/logger", () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }));

// WorkDocumentSchema の必須フィールドを満たす最小の有効データ（genres 等の default 検証用に省略）
const validRaw = {
	id: "RJ001",
	productId: "RJ001",
	title: "作品1",
	circle: "サークル1",
	description: "説明",
	category: "SOU",
	workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ001.html",
	thumbnailUrl: "https://img.dlsite.jp/RJ001.jpg",
	price: { current: 1000, currency: "JPY" },
	lastFetchedAt: "2024-01-01T00:00:00.000Z",
	createdAt: "2024-01-01T00:00:00.000Z",
	updatedAt: "2024-01-01T00:00:00.000Z",
};

const workData = (over: Record<string, unknown> = {}): WorkDocument =>
	({
		productId: "RJ001",
		title: "作品1",
		circle: "サークル1",
		category: "SOU",
		price: { current: 1000, currency: "JPY" },
		rating: { stars: 4.5, count: 10 },
		releaseDateISO: "2024-01-01",
		language: "ja",
		...over,
	}) as unknown as WorkDocument;

beforeEach(() => {
	vi.clearAllMocks();
});

describe("parseWorkDocument", () => {
	it("検証成功時に schema の default を実効化する（genres 等が欠けていても [] になる）", () => {
		const result = parseWorkDocument(validRaw);
		expect(result.genres).toEqual([]);
		expect(result.customGenres).toEqual([]);
		expect(result.sampleImages).toEqual([]);
		// id 等スキーマ非定義の付帯フィールドも温存される
		expect(result.id).toBe("RJ001");
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it("検証失敗時は warn して raw を非破壊で返す（落とさない）", () => {
		const raw = { productId: "RJ999", title: "必須欠落" };
		const result = parseWorkDocument(raw);
		expect(result).toBe(raw); // cast フォールバック（同一参照で継続）
		expect(logger.warn).toHaveBeenCalledTimes(1);
	});
});

describe("convertDocsToWorks", () => {
	it("doc を変換し、id 欠落は productId で補完する", async () => {
		const docs = [
			{ id: "RJ001", data: () => workData({ productId: "RJ001" }) },
			{ id: "doc2", data: () => workData({ productId: "RJ002", id: undefined }) },
		];
		const r = await convertDocsToWorks(docs as never);
		expect(r).toHaveLength(2);
		expect(r.map((w) => w.productId)).toEqual(["RJ001", "RJ002"]);
	});

	it("変換に失敗した doc はスキップして処理を継続する", async () => {
		const docs = [
			{ id: "RJ001", data: () => workData() },
			{ id: "bad", data: () => ({}) }, // 不正データ → 変換失敗 → スキップ
		];
		const r = await convertDocsToWorks(docs as never);
		expect(r.length).toBeGreaterThanOrEqual(1);
		expect(r.some((w) => w.productId === "RJ001")).toBe(true);
	});
});

describe("convertWorksToPlainObjects", () => {
	it("WorkDocument 配列を変換し id 欠落は productId 補完", () => {
		const r = convertWorksToPlainObjects([
			workData(),
			workData({ productId: "RJ002", id: undefined }),
		]);
		expect(r).toHaveLength(2);
	});

	it("不正データはスキップ", () => {
		const r = convertWorksToPlainObjects([workData(), {} as never]);
		expect(r.length).toBeGreaterThanOrEqual(1);
	});
});
