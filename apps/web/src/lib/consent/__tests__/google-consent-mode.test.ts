import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getCurrentConsentState,
	resetAllConsent,
	sendGoogleAnalyticsEvent,
	sendGoogleAnalyticsPageView,
	updateConsent,
	updateGoogleConsent,
} from "../google-consent-mode";

const gtag = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	(window as unknown as { gtag: typeof gtag }).gtag = gtag;
	localStorage.clear();
});

afterEach(() => {
	localStorage.clear();
	// 文字列 "undefined" が残らないよう削除（テスト間の漏れ防止）
	delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
});

const grantAnalytics = {
	analytics: true,
	advertising: false,
	functional: true,
	personalization: false,
};

describe("getCurrentConsentState", () => {
	it("保存が無ければ null", () => {
		expect(getCurrentConsentState()).toBeNull();
	});

	it("保存値を ConsentState に正規化する（functional は既定 true）", () => {
		localStorage.setItem("consent-state", JSON.stringify({ analytics: true }));
		expect(getCurrentConsentState()).toEqual({
			analytics: true,
			advertising: false,
			functional: true,
			personalization: false,
		});
	});

	it("不正 JSON は null（catch）", () => {
		localStorage.setItem("consent-state", "{壊れた");
		expect(getCurrentConsentState()).toBeNull();
	});
});

describe("updateGoogleConsent", () => {
	it("gtag が無ければ何もしない", () => {
		(window as unknown as { gtag: unknown }).gtag = undefined;
		updateGoogleConsent(grantAnalytics);
		expect(gtag).not.toHaveBeenCalled();
	});

	it("gtag があれば consent update と event を送る", () => {
		updateGoogleConsent(grantAnalytics);
		expect(gtag).toHaveBeenCalledWith(
			"consent",
			"update",
			expect.objectContaining({
				analytics_storage: "granted",
				ad_storage: "denied",
			}),
		);
		expect(gtag).toHaveBeenCalledWith("event", "consent_update", expect.any(Object));
	});
});

describe("updateConsent", () => {
	it("gtag 更新 + localStorage 保存を行う", () => {
		updateConsent(grantAnalytics);
		expect(gtag).toHaveBeenCalledWith("consent", "update", expect.any(Object));
		expect(JSON.parse(localStorage.getItem("consent-state") || "{}")).toEqual(grantAnalytics);
		expect(localStorage.getItem("consent-state-date")).toBeTruthy();
	});
});

describe("resetAllConsent", () => {
	it("既定状態に更新し localStorage を削除する", () => {
		localStorage.setItem("consent-state", JSON.stringify(grantAnalytics));
		localStorage.setItem("age-verification", "1");
		resetAllConsent();
		// 既定（functional のみ true）で update
		expect(gtag).toHaveBeenCalledWith(
			"consent",
			"update",
			expect.objectContaining({ analytics_storage: "denied", functionality_storage: "granted" }),
		);
		expect(localStorage.getItem("consent-state")).toBeNull();
		expect(localStorage.getItem("age-verification")).toBeNull();
	});
});

describe("sendGoogleAnalyticsPageView / Event", () => {
	// SPR-299: 同意ゲートを撤廃した。送信可否は GA4 の consent mode（cookieless ping）に委ね、
	// 同意は「識別子を保存するか」だけを意味する。ゲートしていた頃は同意率 3.3% のため
	// カスタムイベントが本番0件・landingPage の 63% が (not set) になっていた。
	it("analytics 同意が無くても送信する（可否は consent mode に委ねる）", () => {
		localStorage.setItem("consent-state", JSON.stringify({ analytics: false }));
		expect(sendGoogleAnalyticsPageView("/x", "G-TEST")).toBe(true);
		sendGoogleAnalyticsEvent("evt");
		expect(gtag).toHaveBeenCalledWith(
			"event",
			"page_view",
			expect.objectContaining({ page_location: "http://localhost:3000/x", send_to: "G-TEST" }),
		);
		expect(gtag).toHaveBeenCalledWith("event", "evt", {});
	});

	// SPR-307 の回帰テスト。以前は測定IDが無いと早期 return しており、その ID は
	// ビルド時にしかバンドルへ入らない env 由来だったため、本番の client では常に
	// 未設定＝page_view が全訪問者・常に欠測していた。ID が無くても送ることが要件。
	it("measurementId が無くても page view を送る（send_to を省いて既定の送信先へ）", () => {
		expect(sendGoogleAnalyticsPageView("/x")).toBe(true);
		expect(gtag).toHaveBeenCalledWith(
			"event",
			"page_view",
			expect.not.objectContaining({ send_to: expect.anything() }),
		);
	});

	it("クエリつきの URL をそのまま page_location に載せる", () => {
		sendGoogleAnalyticsPageView("/works?page=2", "G-TEST");
		expect(gtag).toHaveBeenCalledWith(
			"event",
			"page_view",
			expect.objectContaining({ page_location: "http://localhost:3000/works?page=2" }),
		);
		sendGoogleAnalyticsEvent("my_event", { foo: 1 });
		expect(gtag).toHaveBeenCalledWith("event", "my_event", { foo: 1 });
	});

	it("gtag 未定義なら何もしない", () => {
		(window as unknown as { gtag: unknown }).gtag = undefined;
		sendGoogleAnalyticsEvent("evt");
		expect(gtag).not.toHaveBeenCalled();
	});
});
