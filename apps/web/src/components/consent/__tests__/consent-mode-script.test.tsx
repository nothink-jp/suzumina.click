import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConsentModeScript } from "../consent-mode-script";

type ConsentUpdate = ["consent", "update", Record<string, unknown>];

function consentUpdates(): ConsentUpdate[] {
	return (window.dataLayer ?? []).filter(
		(entry): entry is ConsentUpdate =>
			Array.isArray(entry) && entry[0] === "consent" && entry[1] === "update",
	);
}

function saveConsent(data: Record<string, boolean>, date = new Date()) {
	localStorage.setItem("consent-state", JSON.stringify(data));
	localStorage.setItem("consent-state-date", date.toISOString());
}

beforeEach(() => {
	localStorage.clear();
	// gtag 未ロード（lazyOnload の前）の状態を再現する
	(window as unknown as { dataLayer?: unknown; gtag?: unknown }).dataLayer = undefined;
	(window as unknown as { dataLayer?: unknown; gtag?: unknown }).gtag = undefined;
});

afterEach(() => {
	localStorage.clear();
});

describe("ConsentModeScript", () => {
	it("保存済み同意を default の後に復元する（gtag.js ロード前でも dataLayer に積む）", () => {
		saveConsent({ analytics: true, advertising: false, functional: true, personalization: true });

		render(<ConsentModeScript />);

		// SPR-280: マッピングは google-consent-mode.ts が正本。ad_* は advertising 駆動で、
		// functionality_storage は保存値（以前は復元側だけ "granted" 決め打ちだった）
		expect(consentUpdates()).toEqual([
			[
				"consent",
				"update",
				{
					ad_storage: "denied",
					ad_user_data: "denied",
					ad_personalization: "denied",
					analytics_storage: "granted",
					functionality_storage: "granted",
					personalization_storage: "granted",
				},
			],
		]);
	});

	it("1年より古い同意は復元しない", () => {
		const twoYearsAgo = new Date();
		twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
		saveConsent({ analytics: true, advertising: false, functional: true }, twoYearsAgo);

		render(<ConsentModeScript />);

		expect(consentUpdates()).toEqual([]);
	});

	it("保存が無ければ default だけを積む", () => {
		render(<ConsentModeScript />);

		expect(consentUpdates()).toEqual([]);
		expect(window.dataLayer.filter((entry) => (entry as unknown[])[1] === "default")).toHaveLength(
			2,
		);
	});
});
