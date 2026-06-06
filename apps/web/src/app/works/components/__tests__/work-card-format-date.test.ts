import { describe, expect, it } from "vitest";
import { formatDate } from "../work-card";

// SPR-135 回帰: 発売日表示は実行環境の TZ に依存してはならない。
// TZ 指定の無い JST 壁時計文字列を `new Date()` でローカル TZ 解釈すると、
// SSR(本番=UTC)とクライアント(JST)で暦日がズレて hydration mismatch (#418) を起こす。
describe("WorkCard formatDate（TZ 非依存・決定論的）", () => {
	it("TZ 指定の無い時刻付き文字列を JST の暦日で返す（本来のバグ条件）", () => {
		// "2023-05-06 16:00:00" は JST 壁時計 → JST 暦日は 5/6（UTC 解釈の 5/7 ではない）
		expect(formatDate("2023-05-06 16:00:00")).toBe("2023/05/06");
	});

	it("Z 付き（絶対時刻 UTC）は JST へ変換して返す（date-format と一貫）", () => {
		// 2023-05-06T16:00:00Z = JST 2023-05-07 01:00 → 5/7
		expect(formatDate("2023-05-06T16:00:00Z")).toBe("2023/05/07");
	});

	it("日付のみ ISO を返す", () => {
		expect(formatDate("2023-05-06")).toBe("2023/05/06");
	});

	it("日本語形式を返す（0 埋め）", () => {
		expect(formatDate("2024年4月27日")).toBe("2024/04/27");
		expect(formatDate("2024年04月27日")).toBe("2024/04/27");
	});

	it("スラッシュ形式を返す（0 埋め）", () => {
		expect(formatDate("2023/5/6")).toBe("2023/05/06");
	});

	it("パースできない文字列はそのまま返す", () => {
		expect(formatDate("不明")).toBe("不明");
	});
});
