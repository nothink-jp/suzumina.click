/**
 * DLsite dry-run + raw 捕捉ツールの純粋関数テスト（SPR-139）
 *
 * 実 API を叩く main()/fetch 部分はテスト対象外（モック厳禁の領域）。
 * 解析・引数・整形の純粋ロジックのみを検証する。
 */

import { describe, expect, it } from "vitest";
import {
	analyzeFields,
	type BaselineDiff,
	diffBaseline,
	extractFieldsFromBaselineJson,
	formatReport,
	knownTopLevelFields,
	observedFieldSet,
	parseArgs,
} from "../dlsite-dryrun-capture";

const EMPTY_DIFF: BaselineDiff = { baselineSize: 0, newFields: [], goneFields: [] };

describe("parseArgs", () => {
	it("既定値を返す", () => {
		const o = parseArgs([]);
		expect(o.limit).toBe(20);
		expect(o.concurrency).toBe(5);
		expect(o.delayMs).toBe(400);
		expect(o.save).toBe(true);
		expect(o.workIds).toBeUndefined();
	});

	it("--workid をカンマ区切りで解釈する", () => {
		const o = parseArgs(["--workid", "RJ001, RJ002 ,RJ003"]);
		expect(o.workIds).toEqual(["RJ001", "RJ002", "RJ003"]);
	});

	it("--limit / --concurrency / --delay / --no-save を解釈する", () => {
		const o = parseArgs(["--limit", "5", "--concurrency", "2", "--delay", "100", "--no-save"]);
		expect(o.limit).toBe(5);
		expect(o.concurrency).toBe(2);
		expect(o.delayMs).toBe(100);
		expect(o.save).toBe(false);
	});

	it("不正な数値は既定値にフォールバックする", () => {
		const o = parseArgs(["--limit", "abc"]);
		expect(o.limit).toBe(20);
	});

	it("--baseline / --update-baseline を絶対パスに解決する", () => {
		const o = parseArgs(["--baseline", "tmp/prev.json", "--update-baseline", "tmp/base.json"]);
		expect(o.baselinePath?.endsWith("tmp/prev.json")).toBe(true);
		expect(o.updateBaselinePath?.endsWith("tmp/base.json")).toBe(true);
	});
});

describe("knownTopLevelFields", () => {
	it("スキーマの代表的な既知フィールドを含む", () => {
		const known = knownTopLevelFields();
		expect(known.has("workno")).toBe(true);
		expect(known.has("genres")).toBe(true);
		expect(known.has("creaters")).toBe(true);
		expect(known.size).toBeGreaterThan(20);
	});
});

describe("analyzeFields", () => {
	const known = new Set(["workno", "work_name", "genres", "price"]);

	it("既知フィールドの出現率と未知フィールドを分類する", () => {
		const responses = [
			{ workno: "RJ001", work_name: "A", price: 100, new_field: 1 },
			{ workno: "RJ002", work_name: "B", another_new: true },
		];
		const r = analyzeFields(responses, known);

		expect(r.total).toBe(2);

		const workno = r.presence.find((p) => p.field === "workno");
		expect(workno).toEqual({ field: "workno", count: 2, ratio: 1 });

		const price = r.presence.find((p) => p.field === "price");
		expect(price).toEqual({ field: "price", count: 1, ratio: 0.5 });

		// 未知フィールド
		expect(r.unknownFields).toEqual(
			expect.arrayContaining([
				{ field: "new_field", count: 1 },
				{ field: "another_new", count: 1 },
			]),
		);

		// genres は known だが今回未出現 → 消失候補
		expect(r.absentKnownFields).toContain("genres");
		expect(r.absentKnownFields).not.toContain("workno");
	});

	it("空入力でも壊れない", () => {
		const r = analyzeFields([], known);
		expect(r.total).toBe(0);
		expect(r.presence).toEqual([]);
		expect(r.unknownFields).toEqual([]);
		// 全 known が absent
		expect(r.absentKnownFields.sort()).toEqual([...known].sort());
	});

	it("presence は出現数の多い順に並ぶ", () => {
		const responses = [{ workno: "1", price: 1 }, { workno: "2" }, { workno: "3" }];
		const r = analyzeFields(responses, known);
		expect(r.presence[0]!.field).toBe("workno");
		expect(r.presence[0]!.count).toBe(3);
	});
});

describe("observedFieldSet", () => {
	it("全レスポンスのトップレベルキーの和集合をソートして返す", () => {
		const r = observedFieldSet([
			{ b: 1, a: 2 },
			{ a: 3, c: 4 },
		]);
		expect(r).toEqual(["a", "b", "c"]);
	});

	it("null/非オブジェクトを無視する", () => {
		const r = observedFieldSet([null as unknown as Record<string, unknown>, { x: 1 }]);
		expect(r).toEqual(["x"]);
	});
});

describe("diffBaseline", () => {
	it("ベースライン外を新規、未観測を消失として返す", () => {
		const d = diffBaseline(["a", "b", "new1"], new Set(["a", "b", "gone1", "gone2"]));
		expect(d.newFields).toEqual(["new1"]);
		expect(d.goneFields).toEqual(["gone1", "gone2"]);
		expect(d.baselineSize).toBe(4);
	});

	it("完全一致なら新規も消失も空", () => {
		const d = diffBaseline(["a", "b"], new Set(["a", "b"]));
		expect(d.newFields).toEqual([]);
		expect(d.goneFields).toEqual([]);
	});
});

describe("extractFieldsFromBaselineJson", () => {
	it("string[] を受理する", () => {
		expect(extractFieldsFromBaselineJson(["a", "b"])).toEqual(["a", "b"]);
	});
	it("{ fields: [] } を受理する", () => {
		expect(extractFieldsFromBaselineJson({ fields: ["a", "b"] })).toEqual(["a", "b"]);
	});
	it("capture の report.json（fieldUsage）を受理する", () => {
		const report = {
			fieldUsage: {
				presence: [{ field: "a" }, { field: "b" }],
				unknownFields: [{ field: "c" }],
			},
		};
		expect(extractFieldsFromBaselineJson(report).sort()).toEqual(["a", "b", "c"]);
	});
	it("認識できない形式は例外", () => {
		expect(() => extractFieldsFromBaselineJson(42)).toThrow();
	});
});

describe("formatReport", () => {
	it("ベースライン比の新規/消失・未モデル・取得不可を文字列に含める", () => {
		const report = analyzeFields(
			[{ workno: "RJ001", surprise_field: 1 }],
			new Set(["workno", "genres"]),
		);
		const diff: BaselineDiff = {
			baselineSize: 254,
			newFields: ["surprise_field"],
			goneFields: ["genres"],
		};
		const text = formatReport(report, diff, ["RJ999", "RJ888"]);
		expect(text).toContain("ベースライン比");
		expect(text).toContain("surprise_field"); // 新規 + 未モデル両方に出る
		expect(text).toContain("genres"); // 消失
		expect(text).toContain("RJ999");
		expect(text).toContain("取得不可");
	});

	it("新規/消失/取得不可が無い場合は「なし」を出す", () => {
		const report = analyzeFields([{ workno: "RJ001" }], new Set(["workno"]));
		const text = formatReport(report, EMPTY_DIFF, []);
		expect(text).toContain("なし");
	});
});
