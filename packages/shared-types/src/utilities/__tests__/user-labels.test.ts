import { describe, expect, it } from "vitest";
import { resolveDisplayName } from "../user/display-name";

describe("resolveDisplayName", () => {
	it("displayName があれば最優先で返す", () => {
		expect(resolveDisplayName("表示名", "global", "user")).toBe("表示名");
	});

	it("displayName が無ければ globalName を返す", () => {
		expect(resolveDisplayName(undefined, "global", "user")).toBe("global");
	});

	it("displayName も globalName も無ければ username を返す", () => {
		expect(resolveDisplayName(undefined, undefined, "user")).toBe("user");
	});

	it("空文字は falsy として扱い次の候補にフォールバックする", () => {
		expect(resolveDisplayName("", "", "user")).toBe("user");
	});
});
