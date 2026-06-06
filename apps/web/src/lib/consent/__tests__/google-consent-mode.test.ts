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
		expect(gtag).toHaveBeenCalledWith("consent", "update", expect.objectContaining({
			analytics_storage: "granted",
			ad_storage: "denied",
		}));
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
	it("analytics 同意が無ければ gtag を呼ばない", () => {
		localStorage.setItem("consent-state", JSON.stringify({ analytics: false }));
		sendGoogleAnalyticsPageView("/x");
		sendGoogleAnalyticsEvent("evt");
		expect(gtag).not.toHaveBeenCalled();
	});

	it("analytics 同意 + measurementId があれば送信する", () => {
		process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST";
		localStorage.setItem("consent-state", JSON.stringify({ analytics: true }));
		sendGoogleAnalyticsPageView("/page");
		expect(gtag).toHaveBeenCalledWith("config", "G-TEST", expect.objectContaining({ page_path: "/page" }));
		sendGoogleAnalyticsEvent("my_event", { foo: 1 });
		expect(gtag).toHaveBeenCalledWith("event", "my_event", { foo: 1 });
		process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = undefined;
	});

	it("gtag 未定義なら何もしない", () => {
		(window as unknown as { gtag: unknown }).gtag = undefined;
		sendGoogleAnalyticsEvent("evt");
		expect(gtag).not.toHaveBeenCalled();
	});
});
