/**
 * Google Consent Mode v2 implementation
 * Manages consent state for Google Analytics
 */

// Google Analytics gtag types
type GtagCommand = "config" | "consent" | "event" | "set";
type GtagConfigParams = Record<string, string | number | boolean>;
type ConsentParams = {
	ad_storage?: "granted" | "denied";
	ad_user_data?: "granted" | "denied";
	ad_personalization?: "granted" | "denied";
	analytics_storage?: "granted" | "denied";
	functionality_storage?: "granted" | "denied";
	personalization_storage?: "granted" | "denied";
	security_storage?: "granted" | "denied";
	wait_for_update?: number;
};

type DataLayerEvent =
	| [GtagCommand, "default", ConsentParams]
	| [GtagCommand, "update", ConsentParams]
	| [GtagCommand, string, GtagConfigParams?]
	| [GtagCommand, string, string, GtagConfigParams?]
	| unknown[];

declare global {
	interface Window {
		gtag: (command: GtagCommand, ...args: unknown[]) => void;
		dataLayer: DataLayerEvent[];
	}
}

export interface ConsentState {
	necessary?: boolean;
	analytics: boolean;
	advertising: boolean;
	functional: boolean;
	personalization: boolean;
}

/**
 * Update consent choices and notify Google services
 */
export function updateGoogleConsent(consentState: ConsentState) {
	if (typeof window === "undefined" || !window.gtag) return;

	// Update consent mode with user choices
	window.gtag("consent", "update", {
		ad_storage: consentState.advertising ? "granted" : "denied",
		ad_user_data: consentState.advertising ? "granted" : "denied",
		ad_personalization: consentState.personalization ? "granted" : "denied",
		analytics_storage: consentState.analytics ? "granted" : "denied",
		functionality_storage: consentState.functional ? "granted" : "denied",
		personalization_storage: consentState.personalization ? "granted" : "denied",
	});

	// Send custom event for tracking consent changes
	window.gtag("event", "consent_update", {
		consent_analytics: consentState.analytics,
		consent_advertising: consentState.advertising,
		consent_personalization: consentState.personalization,
	});
}

/**
 * Check current consent state from localStorage
 */
export function getCurrentConsentState(): ConsentState | null {
	if (typeof window === "undefined") return null;

	try {
		const saved = localStorage.getItem("consent-state");
		if (saved) {
			const parsed = JSON.parse(saved);
			// Ensure functional property exists with default value
			return {
				analytics: parsed.analytics === true,
				advertising: parsed.advertising === true,
				functional: parsed.functional !== false,
				personalization: parsed.personalization === true,
			};
		}
	} catch (_error) {
		// Silently handle parsing errors for consent state
	}

	return null;
}

/**
 * Update consent state
 */
export function updateConsent(consentState: ConsentState) {
	if (typeof window === "undefined") return;

	// Update Google Consent Mode
	window.gtag("consent", "update", {
		analytics_storage: consentState.analytics ? "granted" : "denied",
		ad_storage: consentState.advertising ? "granted" : "denied",
		functionality_storage: consentState.functional ? "granted" : "denied",
		personalization_storage: consentState.personalization ? "granted" : "denied",
	});

	// Save to localStorage
	try {
		localStorage.setItem("consent-state", JSON.stringify(consentState));
		localStorage.setItem("consent-state-date", new Date().toISOString());
	} catch (_error) {
		// Silently handle localStorage errors for consent state
	}

	// Apply consent based on updated state
	updateGoogleConsent(consentState);
}

/**
 * Reset all consent to default state
 */
export function resetAllConsent() {
	const defaultState: ConsentState = {
		analytics: false,
		advertising: false,
		functional: true,
		personalization: false,
	};

	updateConsent(defaultState);

	// Clear any existing consent cookies/data
	try {
		localStorage.removeItem("consent-state");
		localStorage.removeItem("consent-state-date");
		localStorage.removeItem("age-verification");
	} catch (_error) {
		// Silently handle localStorage clear errors
	}
}

/**
 * Send a page view to Google Analytics
 *
 * SPR-299: 同意ゲートを外し、Cookie/識別子の可否は GA4 の consent mode に委ねる。
 * 非同意時は `analytics_storage: denied` の cookieless ping として送られ、
 * Cookie も識別子も保存されない（同意の意味を「識別子を保存するか」に純化した）。
 * ゲートしていた頃は同意率 3.3% のため page_view がほぼ送られず、
 * landingPage の 63% が `(not set)` という壊れた指標になっていた（SPR-281 実測）。
 *
 * @returns 実際に送信したか。gtag 未ロードや測定ID未設定では false を返すため、
 * 呼び出し側は再送を判断できる（未送信を「送信済み」と誤認すると landing page が欠ける）
 */
export function sendGoogleAnalyticsPageView(url?: string): boolean {
	if (typeof window === "undefined" || !window.gtag) return false;

	const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
	if (!measurementId) return false;

	window.gtag("config", measurementId, {
		page_path: url || window.location.pathname,
		page_title: document.title,
		page_location: window.location.href,
	});
	return true;
}

/**
 * Utility to send custom events to Google Analytics
 *
 * SPR-299: 同意ゲートを外した。理由は3つ。
 *
 * 1. **測れていなかった**。同意率 3.3%（1/30セッション）でカスタムイベント13種が本番0件。
 *    SPR-137 の成功指標がこの計器でしか測れないのに、母数が事実上存在しなかった（SPR-281 実測）。
 * 2. **線引きが恣意的だった**。GA4 タグは advanced consent mode で同意なしでもロードされ
 *    `session_start` / `scroll` / `video_start` / `user_engagement` を送っている。
 *    つまり「行動の集計は同意なしで送るが、自作イベントだけは送らない」という状態で、
 *    プライバシー上の区別として意味を成していなかった（送信元が Google か自分かの違いでしかない）。
 * 3. **同意の意味を純化できる**。可否は GA4 の consent mode に委ね、非同意時は
 *    `analytics_storage: denied` の cookieless ping として Cookie も識別子も保存せずに送る。
 *    同意は「識別子を保存するか」だけを意味し、イベント送信の可否とは分離される。
 *
 * privacy ページの記述もこの方針に合わせてある（同意がない場合も匿名の統計情報は送信される旨）。
 */
export function sendGoogleAnalyticsEvent(
	eventName: string,
	parameters: Record<string, string | number | boolean> = {},
) {
	if (typeof window === "undefined" || !window.gtag) return;

	window.gtag("event", eventName, parameters);
}
