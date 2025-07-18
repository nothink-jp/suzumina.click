"use client";

import { useEffect } from "react";

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
 */
function setupDataLayer() {
	window.dataLayer = window.dataLayer || [];
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
 */
function applySavedConsent() {
	try {
		const savedConsent = getSavedConsent();
		if (!savedConsent) return;

		const { data, date } = savedConsent;
		if (isConsentValid(date)) {
			updateConsent(data);
			logConsentInDevelopment(data);
		}
	} catch {
		// Silent fail for normal operation
	}
}

/**
 * Get saved consent from localStorage
 */
function getSavedConsent() {
	const consentState = localStorage.getItem("consent-state");
	const consentDate = localStorage.getItem("consent-state-date");

	if (!consentState || !consentDate) return null;

	return {
		data: JSON.parse(consentState),
		date: new Date(consentDate),
	};
}

/**
 * Check if consent is still valid (less than 1 year old)
 */
function isConsentValid(consentDate: Date): boolean {
	const oneYearAgo = new Date();
	oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
	return consentDate > oneYearAgo;
}

interface ConsentData {
	advertising: boolean;
	analytics: boolean;
	personalization: boolean;
}

/**
 * Update consent based on saved preferences
 */
function updateConsent(consentData: ConsentData) {
	function gtag(...args: unknown[]) {
		window.dataLayer.push(args);
	}

	gtag("consent", "update", {
		ad_storage: consentData.advertising ? "granted" : "denied",
		ad_user_data: consentData.advertising ? "granted" : "denied",
		ad_personalization: consentData.personalization ? "granted" : "denied",
		analytics_storage: consentData.analytics ? "granted" : "denied",
		functionality_storage: "granted",
		personalization_storage: consentData.personalization ? "granted" : "denied",
	});
}

/**
 * Log consent application in development environment
 */
function logConsentInDevelopment(consentData: ConsentData) {
	if (window.location.hostname === "localhost") {
		console.log("Applied saved consent:", consentData);
	}
}
