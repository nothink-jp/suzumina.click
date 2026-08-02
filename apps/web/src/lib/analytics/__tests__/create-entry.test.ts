import { describe, expect, it } from "vitest";
import { CREATE_ENTRY, parseCreateEntry } from "../create-entry";
import dimensions from "../ga4-custom-dimensions.json";

describe("作成の入口（SPR-296）", () => {
	it("既知の入口はそのまま通す", () => {
		expect(parseCreateEntry("watch_bulk")).toBe(CREATE_ENTRY.watchBulk);
		expect(parseCreateEntry("detail_clip")).toBe(CREATE_ENTRY.detailClip);
	});

	it("未知・未指定は unknown に畳む（GA4 ディメンションのカーディナリティ汚染を防ぐ）", () => {
		expect(parseCreateEntry("../../etc/passwd")).toBe(CREATE_ENTRY.unknown);
		expect(parseCreateEntry("")).toBe(CREATE_ENTRY.unknown);
		expect(parseCreateEntry(undefined)).toBe(CREATE_ENTRY.unknown);
	});

	it("create_entry が GA4 カスタムディメンションに宣言されている", () => {
		// 宣言漏れは lint:ga4 でも弾かれるが、遡及適用されない＝取り返せないので二重に守る
		expect(dimensions.map((dimension) => dimension.parameterName)).toContain("create_entry");
	});
});
