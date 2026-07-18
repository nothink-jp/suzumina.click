import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { consumeLoginFlowPending, markLoginFlowStarted } from "../login-funnel";

const STORAGE_KEY = "suzumina-login-flow-pending";

beforeEach(() => {
	sessionStorage.clear();
});

afterEach(() => {
	sessionStorage.clear();
});

describe("ログインファネルの一時マーカー", () => {
	it("開始の印を付け、結果側で一度だけ消費できる", () => {
		markLoginFlowStarted();
		expect(sessionStorage.getItem(STORAGE_KEY)).toBe("1");

		expect(consumeLoginFlowPending()).toBe(true);
		expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	it("印が無ければ false を返す（通常のログイン済みページ読み込みで誤発火させない）", () => {
		expect(consumeLoginFlowPending()).toBe(false);
	});

	it("消費は一度きり（同じ印を二度使えない）", () => {
		markLoginFlowStarted();
		expect(consumeLoginFlowPending()).toBe(true);
		expect(consumeLoginFlowPending()).toBe(false);
	});
});
