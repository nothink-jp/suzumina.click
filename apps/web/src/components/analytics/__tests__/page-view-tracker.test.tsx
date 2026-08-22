import { act, render } from "@testing-library/react";
import { usePathname, useSearchParams } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as consent from "@/lib/consent/google-consent-mode";
import { PageViewTracker } from "../page-view-tracker";

vi.mock("next/navigation");

function setRoute(pathname: string, query = "") {
	vi.mocked(usePathname).mockReturnValue(pathname);
	vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(query) as never);
}

/**
 * 送信の成否を模す。SPR-299 で同意ゲートを撤廃したため、戻り値の意味は
 * 「同意されたか」ではなく「gtag が config 済みで実際に送れたか」（SPR-317）。
 */
function mockPageView(sent: boolean) {
	return vi.spyOn(consent, "sendGoogleAnalyticsPageView").mockReturnValue(sent);
}

function dispatchConsentUpdate() {
	act(() => {
		window.dispatchEvent(new CustomEvent("consentUpdate", { detail: { analytics: true } }));
	});
}

/** GA ブートストラップの `gtag('config', ...)` 完了通知（SPR-317） */
function dispatchGaConfigured() {
	act(() => {
		window.dispatchEvent(new Event("gaConfigured"));
	});
}

beforeEach(() => {
	setRoute("/buttons");
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("PageViewTracker", () => {
	it("マウント時に現在の URL を送る", () => {
		const spy = mockPageView(true);

		render(<PageViewTracker />);

		expect(spy).toHaveBeenCalledExactlyOnceWith("/buttons", undefined);
	});

	it("クエリつきの URL は pathname?query の形で送る", () => {
		const spy = mockPageView(true);
		setRoute("/works", "page=2&sort=new");

		render(<PageViewTracker />);

		expect(spy).toHaveBeenCalledExactlyOnceWith("/works?page=2&sort=new", undefined);
	});

	// SPR-307: client では env から測定IDを読めないため prop 経由で受け取る。
	// ここが切れると送信先を絞れなくなる（GTM 併用時に効く）。
	it("prop で渡された measurementId を送信先として引き渡す", () => {
		const spy = mockPageView(true);

		render(<PageViewTracker measurementId="G-TEST" />);

		expect(spy).toHaveBeenCalledExactlyOnceWith("/buttons", "G-TEST");
	});

	// SPR-317 の回帰テスト。GA は lazyOnload（window `load` 後）で config するのに対し
	// この effect は hydration 直後に走るため、初回送信は空振りするのが常態。
	// これを再送できないと、遷移も同意操作もしないセッション＝直帰の page_view が
	// 丸ごと失われ、landingPage が「速いセッションだけ」に偏る。
	it("config 未完了で送れなかった場合、gaConfigured を契機に再送する", () => {
		const spy = mockPageView(false);

		render(<PageViewTracker />);
		expect(spy).toHaveBeenCalledTimes(1); // 呼びはするが config 前なので送信されない

		spy.mockReturnValue(true);
		dispatchGaConfigured();

		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy).toHaveBeenLastCalledWith("/buttons", undefined);
	});

	it("gaConfigured で再送済みなら、後続の consentUpdate で二重に送らない", () => {
		const spy = mockPageView(false);
		render(<PageViewTracker />);

		spy.mockReturnValue(true);
		dispatchGaConfigured();
		dispatchConsentUpdate();

		expect(spy).toHaveBeenCalledTimes(2); // 初回ロード分 + 再送分のみ
	});

	it("gtag 未ロードで送れなかった場合、consentUpdate を契機に再送する", () => {
		const spy = mockPageView(false);

		render(<PageViewTracker />);
		expect(spy).toHaveBeenCalledTimes(1); // 呼びはするが gtag 未ロードで送信されない

		spy.mockReturnValue(true);
		dispatchConsentUpdate();

		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy).toHaveBeenLastCalledWith("/buttons", undefined);
	});

	it("再送後、同じページの consentUpdate 再発火では二重に送らない", () => {
		const spy = mockPageView(false);
		render(<PageViewTracker />);

		spy.mockReturnValue(true);
		dispatchConsentUpdate();
		dispatchConsentUpdate();

		expect(spy).toHaveBeenCalledTimes(2); // 初回ロード分 + 再送分のみ
	});

	it("送信済みのページでは consentUpdate に反応しない", () => {
		const spy = mockPageView(true);
		render(<PageViewTracker />);

		dispatchConsentUpdate();

		expect(spy).toHaveBeenCalledTimes(1);
	});

	it("遷移すれば新しい URL を送る", () => {
		const spy = mockPageView(true);
		const { rerender } = render(<PageViewTracker />);

		setRoute("/works");
		rerender(<PageViewTracker />);

		expect(spy).toHaveBeenNthCalledWith(2, "/works", undefined);
	});
});
