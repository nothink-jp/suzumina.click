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
 * Initialize Google Consent Mode with default denied state
 * This must be called before any Google tags load
 */
export function initializeGoogleConsentMode() {
	if (typeof window === "undefined") return;

	// Initialize dataLayer if not exists
	window.dataLayer = window.dataLayer || [];
	window.gtag =
		window.gtag ||
		((command: GtagCommand, ...args: unknown[]) => {
			window.dataLayer.push([command, ...args] as DataLayerEvent);
		});

	// Set default consent state (deny all until user chooses)
	window.gtag("consent", "default", {
		ad_storage: "denied",
		ad_user_data: "denied",
		ad_personalization: "denied",
		analytics_storage: "denied",
		functionality_storage: "denied",
		personalization_storage: "denied",
		security_storage: "granted", // Always granted for security
		wait_for_update: 2000, // Wait 2 seconds for consent update
	});

	// Set up region-specific settings (for GDPR regions)
	window.gtag("consent", "default", {
		region: [
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
		],
		ad_storage: "denied",
		ad_user_data: "denied",
		ad_personalization: "denied",
		analytics_storage: "denied",
		functionality_storage: "denied",
		personalization_storage: "denied",
		wait_for_update: 2000,
	});
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
 * Load Google Analytics with consent mode
 */
export function loadGoogleAnalytics(measurementId: string) {
	if (typeof window === "undefined") return;

	// Load gtag script
	const script = document.createElement("script");
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
	document.head.appendChild(script);

	// Configure Google Analytics
	window.gtag("config", measurementId, {
		// Wait for consent before initializing
		send_page_view: false,
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
 * Apply saved consent state on page load
 */
export function applySavedConsentState() {
	const consentState = getCurrentConsentState();

	if (consentState) {
		updateGoogleConsent(consentState);

		// Load appropriate services based on consent
		const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

		if (consentState.analytics && GA_MEASUREMENT_ID) {
			loadGoogleAnalytics(GA_MEASUREMENT_ID);
		}
	}
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
 * Only works if analytics consent is granted
 */
export function sendGoogleAnalyticsPageView(url?: string) {
	if (typeof window === "undefined" || !window.gtag) return;

	const consentState = getCurrentConsentState();
	if (!consentState?.analytics) {
		// Page view blocked - no consent
		return;
	}

	const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
	if (!measurementId) return;

	window.gtag("config", measurementId, {
		page_path: url || window.location.pathname,
		page_title: document.title,
		page_location: window.location.href,
	});
}

/**
 * Utility to send custom events to Google Analytics
 * Only works if analytics consent is granted
 */
export function sendGoogleAnalyticsEvent(
	eventName: string,
	parameters: Record<string, string | number | boolean> = {},
) {
	if (typeof window === "undefined" || !window.gtag) return;

	const consentState = getCurrentConsentState();
	if (!consentState?.analytics) {
		// Analytics event blocked - no consent
		return;
	}

	window.gtag("event", eventName, parameters);
}
