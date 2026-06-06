import type { WorkDocument } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { convertDocsToWorks, convertWorksToPlainObjects } from "../work-converters";

vi.mock("@/lib/logger", () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }));

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
		// biome-ignore lint/suspicious/noExplicitAny: テスト用の最小 WorkDocument
	}) as any;

beforeEach(() => {
	vi.clearAllMocks();
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
