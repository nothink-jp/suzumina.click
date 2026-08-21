"use client";

import { useEffect } from "react";
import { applyGoogleConsent, getCurrentConsentState } from "@/lib/consent/google-consent-mode";

// EU/GDPR countries list
const GDPR_COUNTRIES = [
	"AT",
	"BE",
	"BG",
	"HR",
	"CY",
	"CZ",
	"DK",
	"EE",
	"FI",
	"FR",
	"DE",
	"GR",
	"HU",
	"IE",
	"IT",
	"LV",
	"LT",
	"LU",
	"MT",
	"NL",
	"PL",
	"PT",
	"RO",
	"SK",
	"SI",
	"ES",
	"SE",
];

// Default consent settings
const DEFAULT_CONSENT = {
	ad_storage: "denied" as const,
	ad_user_data: "denied" as const,
	ad_personalization: "denied" as const,
	analytics_storage: "denied" as const,
	functionality_storage: "denied" as const,
	personalization_storage: "denied" as const,
	security_storage: "granted" as const,
	wait_for_update: 2000,
};

// GDPR region specific settings
const GDPR_CONSENT = {
	region: GDPR_COUNTRIES,
	ad_storage: "denied" as const,
	ad_user_data: "denied" as const,
	ad_personalization: "denied" as const,
	analytics_storage: "denied" as const,
	functionality_storage: "denied" as const,
	personalization_storage: "denied" as const,
	wait_for_update: 2000,
};

/**
 * Google Consent Mode initialization script
 * Must be loaded before any Google tags to ensure proper consent handling
 */
export function ConsentModeScript() {
	useEffect(() => {
		initializeGoogleConsent();
	}, []);

	return null;
}

/**
 * Initialize Google Consent Mode
 */
function initializeGoogleConsent() {
	setupDataLayer();
	setDefaultConsent();
	applySavedConsent();
}

/**
 * Setup Google Analytics dataLayer
 *
 * `gtag.js` を lazyOnload で `load` 後にロードしているため、hydration 直後から
 * `load` までの間に呼ばれる `window.gtag(...)` を取りこぼさないよう、
 * dataLayer に積むだけの polyfill 関数を先に定義しておく。
 * gtag.js ロード時に `window.gtag` は GA 本体の実装で上書きされ、積み残しの
 * dataLayer は通常通り処理される。
 */
function setupDataLayer() {
	window.dataLayer = window.dataLayer || [];
	if (typeof window.gtag !== "function") {
		window.gtag = function gtag(...args: unknown[]) {
			window.dataLayer.push(args as unknown as Parameters<typeof window.dataLayer.push>[0]);
		};
	}
}

/**
 * Set default consent state
 */
function setDefaultConsent() {
	function gtag(...args: unknown[]) {
		window.dataLayer.push(args);
	}

	// Global default consent
	gtag("consent", "default", DEFAULT_CONSENT);

	// GDPR region specific settings
	gtag("consent", "default", GDPR_CONSENT);
}

/**
 * Apply saved consent preferences if valid
 *
 * SPR-280: 保存値の読み取り・期限判定・gtag へのマッピングはすべて
 * google-consent-mode.ts が正本。ここは gtag.js ロード前だが、setupDataLayer の
 * polyfill が window.gtag を用意済みなので同じ関数を通せる。
 * 復元は「ユーザー操作」ではないので consent_update イベントは送らない。
 *
 * 保存済み同意を gtag に反映するのはこの経路だけ（バナー側は再 push しない）。
 */
function applySavedConsent() {
	const savedConsent = getCurrentConsentState();
	if (savedConsent) {
		applyGoogleConsent(savedConsent);
	}
}
