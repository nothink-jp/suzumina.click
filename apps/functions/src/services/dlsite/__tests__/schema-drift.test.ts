/**
 * DLsite スキーマドリフト観測のテスト（SPR-140）
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/logger", () => ({
	warn: vi.fn(),
	debug: vi.fn(),
	info: vi.fn(),
	error: vi.fn(),
}));

import * as logger from "../../../shared/logger";
import {
	detectNewFields,
	KNOWN_FIELDS,
	recordSchemaDriftForBatch,
	resetSchemaDriftState,
	SCHEMA_DRIFT_ALERT,
} from "../schema-drift";

const mockWarn = vi.mocked(logger.warn);

beforeEach(() => {
	vi.clearAllMocks();
	resetSchemaDriftState();
});

describe("KNOWN_FIELDS", () => {
	it("ベースラインと Zod スキーマのキーを含む", () => {
		// ベースライン由来（未モデルだが観測実績あり）
		expect(KNOWN_FIELDS.has("workno")).toBe(true);
		expect(KNOWN_FIELDS.has("genres")).toBe(true);
		// 254 + Zod キーの union なので相応に大きい
		expect(KNOWN_FIELDS.size).toBeGreaterThan(200);
	});
});

describe("detectNewFields", () => {
	const known = new Set(["workno", "work_name"]);

	it("既知集合に無いフィールドのみ件数付きで返す", () => {
		const r = detectNewFields(
			[
				{ workno: "RJ001", work_name: "A", brand_new: 1 },
				{ workno: "RJ002", brand_new: 2, another: true },
			],
			known,
		);
		expect(r).toEqual({ brand_new: 2, another: 1 });
	});

	it("既知のみなら空", () => {
		expect(detectNewFields([{ workno: "x", work_name: "y" }], known)).toEqual({});
	});

	it("null/非オブジェクト要素を無視する", () => {
		const r = detectNewFields(
			[null as unknown as Record<string, unknown>, { brand_new: 1 }],
			known,
		);
		expect(r).toEqual({ brand_new: 1 });
	});
});

describe("recordSchemaDriftForBatch", () => {
	it("既知フィールドのみなら WARN しない", () => {
		recordSchemaDriftForBatch([{ workno: "RJ001", genres: [] }], { batchSize: 1 });
		expect(mockWarn).not.toHaveBeenCalled();
	});

	it("新フィールド出現で alert マーカー付き WARN を出す", () => {
		recordSchemaDriftForBatch([{ workno: "RJ001", totally_new_field: 1 }], { batchSize: 1 });
		expect(mockWarn).toHaveBeenCalledTimes(1);
		const [, payload] = mockWarn.mock.calls[0];
		expect(payload).toMatchObject({
			alert: SCHEMA_DRIFT_ALERT,
			newFields: ["totally_new_field"],
		});
	});

	it("同一の新フィールドはプロセス内で1度しか WARN しない（重複抑制）", () => {
		recordSchemaDriftForBatch([{ totally_new_field: 1 }]);
		recordSchemaDriftForBatch([{ totally_new_field: 1 }]);
		recordSchemaDriftForBatch([{ totally_new_field: 1 }]);
		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

	it("新たな別フィールドが出たら改めて WARN する", () => {
		recordSchemaDriftForBatch([{ first_new: 1 }]);
		recordSchemaDriftForBatch([{ second_new: 1 }]);
		expect(mockWarn).toHaveBeenCalledTimes(2);
	});

	it("壊れた入力でも例外を投げない（本番フェッチを止めない）", () => {
		expect(() =>
			recordSchemaDriftForBatch(undefined as unknown as Array<Record<string, unknown>>),
		).not.toThrow();
	});

	// 既知フィールドと未知フィールドが混在しても、resetSchemaDriftState で状態が初期化されることを担保
	it("resetSchemaDriftState 後は再び WARN される", () => {
		recordSchemaDriftForBatch([{ repeat_new: 1 }]);
		expect(mockWarn).toHaveBeenCalledTimes(1);
		resetSchemaDriftState();
		recordSchemaDriftForBatch([{ repeat_new: 1 }]);
		expect(mockWarn).toHaveBeenCalledTimes(2);
	});
});
