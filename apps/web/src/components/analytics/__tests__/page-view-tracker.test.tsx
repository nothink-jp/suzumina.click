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

/** 同意状態を模す。granted=true のときだけ実送信が成功したことにする */
function mockPageView(granted: boolean) {
	return vi.spyOn(consent, "sendGoogleAnalyticsPageView").mockReturnValue(granted);
}

function dispatchConsentUpdate() {
	act(() => {
		window.dispatchEvent(new CustomEvent("consentUpdate", { detail: { analytics: true } }));
	});
}

beforeEach(() => {
	setRoute("/buttons");
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("PageViewTracker", () => {
	it("同意済みならマウント時に現在の URL を送る", () => {
		const spy = mockPageView(true);

		render(<PageViewTracker />);

		expect(spy).toHaveBeenCalledExactlyOnceWith("/buttons");
	});

	it("クエリつきの URL は pathname?query の形で送る", () => {
		const spy = mockPageView(true);
		setRoute("/works", "page=2&sort=new");

		render(<PageViewTracker />);

		expect(spy).toHaveBeenCalledExactlyOnceWith("/works?page=2&sort=new");
	});

	it("未同意のロードは送らず、同意反映後にその時開いているページを送る", () => {
		const spy = mockPageView(false);

		render(<PageViewTracker />);
		expect(spy).toHaveBeenCalledTimes(1); // 呼びはするが送信されない（同意ゲート内で no-op）

		spy.mockReturnValue(true);
		dispatchConsentUpdate();

		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy).toHaveBeenLastCalledWith("/buttons");
	});

	it("同意反映後、同じページの consentUpdate 再発火では二重に送らない", () => {
		const spy = mockPageView(false);
		render(<PageViewTracker />);

		spy.mockReturnValue(true);
		dispatchConsentUpdate();
		dispatchConsentUpdate();

		expect(spy).toHaveBeenCalledTimes(2); // 初回ロード分 + 同意反映分のみ
	});

	it("同意済みで送信済みのページでは consentUpdate に反応しない", () => {
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

		expect(spy).toHaveBeenNthCalledWith(2, "/works");
	});
});
