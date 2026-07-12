import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	applyStoredInternalTrafficFlag,
	OWNER_DISCORD_ID,
	syncInternalTrafficFromSession,
} from "../internal-traffic";

const gtag = vi.fn();
const STORAGE_KEY = "suzumina-internal-traffic";

beforeEach(() => {
	vi.clearAllMocks();
	(window as unknown as { gtag: typeof gtag }).gtag = gtag;
	localStorage.clear();
});

afterEach(() => {
	localStorage.clear();
});

describe("内部トラフィックのタグ付け (SPR-149)", () => {
	it("オーナーのセッションで traffic_type=internal を適用し、印を永続する", () => {
		syncInternalTrafficFromSession(OWNER_DISCORD_ID);
		expect(gtag).toHaveBeenCalledWith("set", { traffic_type: "internal" });
		expect(localStorage.getItem(STORAGE_KEY)).toBe("1");
	});

	it("別ユーザーのログインで印を外す（gtag set は呼ばない）", () => {
		localStorage.setItem(STORAGE_KEY, "1");
		syncInternalTrafficFromSession("999999999999999999");
		expect(gtag).not.toHaveBeenCalled();
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	it("未ログイン（undefined）では印を保持する＝オーナーのブラウザの匿名アクセスも内部扱い", () => {
		localStorage.setItem(STORAGE_KEY, "1");
		syncInternalTrafficFromSession(undefined);
		expect(localStorage.getItem(STORAGE_KEY)).toBe("1");
	});

	it("印があればセッション解決を待たずにタグを適用する（初回 page_view の取りこぼし低減）", () => {
		localStorage.setItem(STORAGE_KEY, "1");
		applyStoredInternalTrafficFlag();
		expect(gtag).toHaveBeenCalledWith("set", { traffic_type: "internal" });
	});

	it("印が無ければ何もしない", () => {
		applyStoredInternalTrafficFlag();
		expect(gtag).not.toHaveBeenCalled();
	});
});
