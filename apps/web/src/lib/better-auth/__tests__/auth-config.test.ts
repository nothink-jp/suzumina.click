import { describe, expect, it } from "vitest";
import { auth } from "../auth";

/**
 * better-auth の「重要設定ガード」テスト（SPR-168）。
 *
 * 移行中に実機でしか捕捉できなかったクラスのバグ（nextCookies 欠落による
 * state_mismatch / basePath 不一致）を CI で検出するための回帰ガード。
 */
describe("better-auth 重要設定ガード（SPR-168）", () => {
	const pluginIds = (auth.options.plugins ?? []).map((p) => p.id);

	it("basePath が /api/auth（Discord redirect URI と一致）", () => {
		expect(auth.options.basePath).toBe("/api/auth");
	});

	it("nextCookies プラグインが存在し、配列の最後に置かれている", () => {
		// nextCookies は Set-Cookie を Next の cookies() に書き戻すため必ず最後（欠落/順序違反は state_mismatch を招く）。
		expect(pluginIds).toContain("next-cookies");
		expect(pluginIds.at(-1)).toBe("next-cookies");
	});

	it("customSession プラグインが存在する（appUser エンリッチ）", () => {
		expect(pluginIds).toContain("custom-session");
	});
});
