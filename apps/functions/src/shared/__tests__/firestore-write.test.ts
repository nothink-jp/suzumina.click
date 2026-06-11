import { FieldValue } from "@google-cloud/firestore";
import { describe, expect, it } from "vitest";
import { withClearedUndefined } from "../firestore-write";

describe("withClearedUndefined (SPR-179: sticky フィールドのクリア)", () => {
	it("undefined フィールドは FieldValue.delete() に変換される（旧値を残さずクリア）", () => {
		const result = withClearedUndefined({ totalWorks: 100, lastError: undefined });

		expect(result.totalWorks).toBe(100);
		const del = result.lastError as ReturnType<typeof FieldValue.delete>;
		expect(del.isEqual(FieldValue.delete())).toBe(true);
	});

	it("定義済みの値（0 / false / 空文字を含む）はそのまま渡す", () => {
		expect(withClearedUndefined({ a: 0, b: false, c: "" })).toEqual({ a: 0, b: false, c: "" });
	});

	it("空オブジェクトは空オブジェクトを返す", () => {
		expect(withClearedUndefined({})).toEqual({});
	});
});
