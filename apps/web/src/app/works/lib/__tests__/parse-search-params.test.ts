import { describe, expect, it } from "vitest";
import { parseWorksSearchParams } from "../parse-search-params";

function getterFrom(values: Record<string, string>) {
	return { get: (key: string) => (key in values ? values[key] : null) };
}

describe("parseWorksSearchParams", () => {
	it("showR18が未指定の場合はundefinedを返す（fail-closedの適用は呼び出し側の責務）", () => {
		const result = parseWorksSearchParams(getterFrom({}));
		expect(result.showR18).toBeUndefined();
	});

	it("showR18=trueを明示指定した場合はtrueを返す", () => {
		const result = parseWorksSearchParams(getterFrom({ showR18: "true" }));
		expect(result.showR18).toBe(true);
	});

	it("showR18=falseを明示指定した場合はfalseを返す（undefinedと区別できる）", () => {
		const result = parseWorksSearchParams(getterFrom({ showR18: "false" }));
		expect(result.showR18).toBe(false);
	});

	it("page/limitのデフォルト値とバリデーションが機能する", () => {
		const result = parseWorksSearchParams(getterFrom({ page: "0", limit: "999" }));
		expect(result.page).toBe(1); // 0以下は1にクランプ
		expect(result.limit).toBe(12); // 許可外の値はデフォルト12
	});
});
