/**
 * price-history-saver.ts のテスト（SPR-229: bulkCheckPriceHistoryExistsToday 中心）
 */

import type { DLsiteApiResponse } from "@suzumina.click/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeRef(workId: string, today: string, state: { getResult: unknown; setMock: unknown }) {
	return {
		id: today,
		parent: { parent: { id: workId } },
		get: vi.fn().mockImplementation(async () => state.getResult),
		set: state.setMock,
	};
}

vi.mock("../../../infrastructure/database/firestore", () => {
	const getAll = vi.fn();
	const state = {
		getResult: { exists: false } as { exists: boolean; data?: () => unknown },
		setMock: vi.fn().mockResolvedValue(undefined),
	};
	const collection = vi.fn((name: string) => {
		if (name !== "works") {
			throw new Error(`unexpected collection: ${name}`);
		}
		return {
			doc: (workId: string) => ({
				collection: (sub: string) => {
					if (sub !== "priceHistory") {
						throw new Error(`unexpected subcollection: ${sub}`);
					}
					return {
						doc: (today: string) => makeRef(workId, today, state),
					};
				},
			}),
		};
	});

	return {
		default: { collection, getAll },
		__state: state,
	};
});

vi.mock("../../../shared/logger", () => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

const { bulkCheckPriceHistoryExistsToday, savePriceHistory } = await import(
	"../price-history-saver"
);
const firestoreMock = vi.mocked(await import("../../../infrastructure/database/firestore"));
const mockState = (firestoreMock as unknown as { __state: unknown }).__state as {
	getResult: { exists: boolean; data?: () => unknown };
	setMock: ReturnType<typeof vi.fn>;
};

const baseApiResponse: DLsiteApiResponse = {
	workno: "RJ000001",
	price: 1000,
} as unknown as DLsiteApiResponse;

describe("savePriceHistory", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockState.getResult = { exists: false };
	});

	it("worknoが存在しない場合は保存せずfalseを返す", async () => {
		const result = await savePriceHistory("RJ000001", { ...baseApiResponse, workno: undefined });

		expect(result).toBe(false);
		expect(mockState.setMock).not.toHaveBeenCalled();
	});

	it("当日分が既に存在する場合は保存をスキップしtrueを返す", async () => {
		mockState.getResult = {
			exists: true,
			data: () => ({ capturedAt: "2026-07-05T00:00:00+09:00" }),
		};

		const result = await savePriceHistory("RJ000001", baseApiResponse);

		expect(result).toBe(true);
		expect(mockState.setMock).not.toHaveBeenCalled();
	});

	it("有効な価格データがある場合、価格情報を保存する", async () => {
		const result = await savePriceHistory("RJ000001", baseApiResponse);

		expect(result).toBe(true);
		expect(mockState.setMock).toHaveBeenCalledWith(
			expect.objectContaining({ workId: "RJ000001", price: 1000 }),
		);
	});

	it("有効な価格データがない場合、null埋めで保存する", async () => {
		const result = await savePriceHistory("RJ000001", {
			...baseApiResponse,
			price: undefined,
			locale_price: undefined,
		});

		expect(result).toBe(true);
		expect(mockState.setMock).toHaveBeenCalledWith(
			expect.objectContaining({ price: null, officialPrice: null }),
		);
	});

	it("locale_priceが配列の場合はオブジェクトへ正規化する", async () => {
		const result = await savePriceHistory("RJ000001", {
			...baseApiResponse,
			locale_price: [{ currency: "USD", price: 9.99 }],
		} as unknown as DLsiteApiResponse);

		expect(result).toBe(true);
		expect(mockState.setMock).toHaveBeenCalledWith(
			expect.objectContaining({ localePrice: { USD: 9.99 } }),
		);
	});

	it("Firestoreエラー時はfalseを返す", async () => {
		mockState.setMock.mockRejectedValueOnce(new Error("Firestore error"));

		const result = await savePriceHistory("RJ000001", baseApiResponse);

		expect(result).toBe(false);
	});
});

describe("bulkCheckPriceHistoryExistsToday", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("空配列を渡した場合、Firestoreに問い合わせず空集合を返す", async () => {
		const result = await bulkCheckPriceHistoryExistsToday([], "2026-07-05");

		expect(result.size).toBe(0);
		expect(firestoreMock.default.getAll).not.toHaveBeenCalled();
	});

	it("存在するドキュメントの作品IDのみを集合に含める", async () => {
		vi.mocked(firestoreMock.default.getAll).mockResolvedValue([
			{ exists: true, ref: { parent: { parent: { id: "RJ001" } } } },
			{ exists: false, ref: { parent: { parent: { id: "RJ002" } } } },
			{ exists: true, ref: { parent: { parent: { id: "RJ003" } } } },
		] as never);

		const result = await bulkCheckPriceHistoryExistsToday(
			["RJ001", "RJ002", "RJ003"],
			"2026-07-05",
		);

		expect(result).toEqual(new Set(["RJ001", "RJ003"]));
	});

	it("300件超は複数チャンクに分割してgetAllを呼ぶ", async () => {
		const workIds = Array.from({ length: 350 }, (_, i) => `RJ${String(i).padStart(6, "0")}`);
		vi.mocked(firestoreMock.default.getAll).mockImplementation((async (...refs: unknown[]) =>
			refs.map((ref) => ({ exists: true, ref }))) as never);

		const result = await bulkCheckPriceHistoryExistsToday(workIds, "2026-07-05");

		expect(firestoreMock.default.getAll).toHaveBeenCalledTimes(2);
		expect(result.size).toBe(350);
	});
});
