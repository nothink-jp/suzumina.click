import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AgeVerificationProvider, useAgeVerification } from "../age-verification-context";

const wrapper = ({ children }: { children: React.ReactNode }) => (
	<AgeVerificationProvider>{children}</AgeVerificationProvider>
);

const renderAgeVerification = () => renderHook(() => useAgeVerification(), { wrapper });

// 30日判定用のヘルパ（ISO 文字列）
const daysAgoIso = (days: number) => {
	const d = new Date();
	d.setDate(d.getDate() - days);
	return d.toISOString();
};

describe("useAgeVerification", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("Provider 外で使うと例外を投げる", () => {
		expect(() => renderHook(() => useAgeVerification())).toThrow(
			"useAgeVerification must be used within an AgeVerificationProvider",
		);
	});

	it("初期状態（localStorage 空）は未確認・非アダルト・読込完了", () => {
		const { result } = renderAgeVerification();
		expect(result.current.isAgeVerified).toBe(false);
		expect(result.current.isAdult).toBe(false);
		expect(result.current.showR18Content).toBe(false);
		expect(result.current.isLoading).toBe(false);
	});

	it("updateAgeVerification(true) で確認済み・アダルト・R18 表示可になり localStorage に保存する", () => {
		const { result } = renderAgeVerification();

		act(() => {
			result.current.updateAgeVerification(true);
		});

		expect(result.current.isAgeVerified).toBe(true);
		expect(result.current.isAdult).toBe(true);
		expect(result.current.showR18Content).toBe(true);
		expect(localStorage.getItem("age-verified")).toBe("true");
		expect(localStorage.getItem("age-verification-adult")).toBe("true");
		expect(localStorage.getItem("age-verification-date")).not.toBeNull();
	});

	it("updateAgeVerification(false) は確認済みだが非アダルト・R18 非表示", () => {
		const { result } = renderAgeVerification();

		act(() => {
			result.current.updateAgeVerification(false);
		});

		expect(result.current.isAgeVerified).toBe(true);
		expect(result.current.isAdult).toBe(false);
		expect(result.current.showR18Content).toBe(false);
		expect(localStorage.getItem("age-verification-adult")).toBe("false");
	});

	it("30日以内の有効な確認（adult=true）はマウント時に復元される", () => {
		localStorage.setItem("age-verified", "true");
		localStorage.setItem("age-verification-date", daysAgoIso(10));
		localStorage.setItem("age-verification-adult", "true");

		const { result } = renderAgeVerification();

		expect(result.current.isAgeVerified).toBe(true);
		expect(result.current.isAdult).toBe(true);
		expect(result.current.showR18Content).toBe(true);
	});

	it("30日以内の確認でも adult=false なら復元時に R18 は非表示", () => {
		localStorage.setItem("age-verified", "true");
		localStorage.setItem("age-verification-date", daysAgoIso(10));
		localStorage.setItem("age-verification-adult", "false");

		const { result } = renderAgeVerification();

		expect(result.current.isAgeVerified).toBe(true);
		expect(result.current.isAdult).toBe(false);
		expect(result.current.showR18Content).toBe(false);
	});

	it("30日を超えた確認は期限切れとしてクリアされ未確認に戻る", () => {
		localStorage.setItem("age-verified", "true");
		localStorage.setItem("age-verification-date", daysAgoIso(40));
		localStorage.setItem("age-verification-adult", "true");

		const { result } = renderAgeVerification();

		expect(result.current.isAgeVerified).toBe(false);
		expect(result.current.isAdult).toBe(false);
		// 期限切れの値は削除される
		expect(localStorage.getItem("age-verified")).toBeNull();
		expect(localStorage.getItem("age-verification-date")).toBeNull();
		expect(localStorage.getItem("age-verification-adult")).toBeNull();
	});

	it("age-verified が true でも日付が無ければ復元しない", () => {
		localStorage.setItem("age-verified", "true");
		// age-verification-date 無し

		const { result } = renderAgeVerification();

		expect(result.current.isAgeVerified).toBe(false);
	});
});
