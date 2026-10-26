import { describe, expect, it } from "vitest";
import { errorMessage } from "../error-message";

describe("errorMessage", () => {
	it("Error なら message を返す", () => {
		expect(errorMessage(new Error("失敗しました"))).toBe("失敗しました");
	});

	it("Error 以外は String() で文字列にする", () => {
		expect(errorMessage("文字列のエラー")).toBe("文字列のエラー");
		expect(errorMessage(42)).toBe("42");
		expect(errorMessage(undefined)).toBe("undefined");
	});
});
