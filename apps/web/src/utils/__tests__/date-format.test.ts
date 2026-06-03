import { describe, expect, it } from "vitest";
import { formatJSTDate, formatJSTDateTime } from "../date-format";

describe("date-format（JST 固定・TZ 非依存）", () => {
	// SPR-135 回帰: TZ 指定の無い日時文字列（DLsite 発売日など）は JST の壁時計として
	// 解釈されなければならない。new Date() の実行環境 TZ 依存パースを使うと、SSR(本番=UTC)と
	// クライアント(JST)で暦日がズレて React #418 (hydration mismatch) を起こす。
	describe("formatJSTDate", () => {
		it("TZ 指定の無い時刻付き文字列を JST の暦日として返す", () => {
			// "2023-05-06 16:00:00" は JST 壁時計 → JST 暦日は 5/6（UTC 解釈の 5/7 ではない）
			expect(formatJSTDate("2023-05-06 16:00:00")).toBe("2023年 5月 6日");
		});

		it("Z 付き（絶対時刻）は JST へ変換して返す", () => {
			// 2023-05-06T16:00:00Z = JST 2023-05-07 01:00 → 5/7
			expect(formatJSTDate("2023-05-06T16:00:00Z")).toBe("2023年 5月 7日");
		});

		it("無効な文字列はそのまま返す", () => {
			expect(formatJSTDate("不明")).toBe("不明");
		});
	});

	describe("formatJSTDateTime", () => {
		it("TZ 指定の無い時刻付き文字列を JST の壁時計時刻で返す", () => {
			expect(formatJSTDateTime("2023-05-06 16:00:00")).toBe("2023年 5月 6日 16時00分");
		});

		it("Z 付き（絶対時刻）は JST へ変換して返す", () => {
			expect(formatJSTDateTime("2023-05-06T16:00:00Z")).toBe("2023年 5月 7日 1時00分");
		});
	});
});
