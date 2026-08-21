import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	applyGoogleConsent,
	getCurrentConsentState,
	normalizeConsentState,
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

function saveConsent(data: Record<string, boolean>, savedAt = new Date()) {
	localStorage.setItem("consent-state", JSON.stringify(data));
	localStorage.setItem("consent-state-date", savedAt.toISOString());
}

function yearsAgo(years: number) {
	const date = new Date();
	date.setFullYear(date.getFullYear() - years);
	return date;
}

describe("getCurrentConsentState", () => {
	it("保存が無ければ null", () => {
		expect(getCurrentConsentState()).toBeNull();
	});

	it("保存値を ConsentState に正規化する（functional は既定 true）", () => {
		saveConsent({ analytics: true });
		expect(getCurrentConsentState()).toEqual({
			analytics: true,
			advertising: false,
			functional: true,
			personalization: false,
		});
	});

	it("不正 JSON は null（catch）", () => {
		saveConsent({});
		localStorage.setItem("consent-state", "{壊れた");
		expect(getCurrentConsentState()).toBeNull();
	});

	// SPR-280: 期限判定は consent-mode-script.tsx 側にしか無く、バナーが参照する
	// この関数は日付を見ていなかったため「1年で再確認」が実際には起きなかった
	it("保存から1年を超えた同意は null（＝未同意扱いで再確認へ）", () => {
		saveConsent({ analytics: true }, yearsAgo(2));
		expect(getCurrentConsentState()).toBeNull();
	});

	it("保存日時が無い（壊れた保存）場合も null", () => {
		localStorage.setItem("consent-state", JSON.stringify({ analytics: true }));
		expect(getCurrentConsentState()).toBeNull();
	});
});

describe("normalizeConsentState", () => {
	it("欠けた項目は既定に落とす（functional のみ true）", () => {
		expect(normalizeConsentState({})).toEqual({
			analytics: false,
			advertising: false,
			functional: true,
			personalization: false,
		});
		expect(normalizeConsentState(null)).toEqual({
			analytics: false,
			advertising: false,
			functional: true,
			personalization: false,
		});
	});
});

describe("applyGoogleConsent", () => {
	// SPR-280: ad_personalization は「広告のパーソナライズ」なので advertising 駆動。
	// personalization カテゴリが駆動するのは personalization_storage だけ。
	// 以前は personalization 駆動で、バナーの「許可」が
	// ad_storage: denied なのに ad_personalization: granted を生んでいた。
	it("ad_* は advertising 駆動・personalization_storage だけが personalization 駆動", () => {
		applyGoogleConsent({
			analytics: true,
			advertising: false,
			functional: true,
			personalization: true,
		});
		expect(gtag).toHaveBeenCalledWith("consent", "update", {
			ad_storage: "denied",
			ad_user_data: "denied",
			ad_personalization: "denied",
			analytics_storage: "granted",
			functionality_storage: "granted",
			personalization_storage: "granted",
		});
	});

	it("advertising 同意時は ad_* が揃って granted", () => {
		applyGoogleConsent({
			analytics: false,
			advertising: true,
			functional: true,
			personalization: false,
		});
		expect(gtag).toHaveBeenCalledWith(
			"consent",
			"update",
			expect.objectContaining({
				ad_storage: "granted",
				ad_user_data: "granted",
				ad_personalization: "granted",
			}),
		);
	});

	it("consent_update イベントは送らない（復元時に使うため）", () => {
		applyGoogleConsent(grantAnalytics);
		expect(gtag).not.toHaveBeenCalledWith("event", "consent_update", expect.anything());
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

	// SPR-280: 以前は updateConsent 自身が4フィールドだけの consent update を push した
	// 直後に updateGoogleConsent が6フィールドを push しており、ad_user_data /
	// ad_personalization を欠いた中間状態が一瞬存在した
	it("consent update は1回だけ push する", () => {
		updateConsent(grantAnalytics);
		const consentUpdates = gtag.mock.calls.filter(
			([command, action]) => command === "consent" && action === "update",
		);
		expect(consentUpdates).toHaveLength(1);
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
		saveConsent({ analytics: false });
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
