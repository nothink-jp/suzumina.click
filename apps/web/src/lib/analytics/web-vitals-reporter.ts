/**
 * Web Vitals Reporter for Google Analytics 4
 *
 * Measures Core Web Vitals and sends them to GA4 as custom events.
 * Respects user consent via Google Consent Mode.
 *
 * Metrics:
 * - LCP (Largest Contentful Paint): Should be ≤2.5s
 * - INP (Interaction to Next Paint): Should be ≤200ms (replaced FID in March 2024)
 * - CLS (Cumulative Layout Shift): Should be ≤0.1
 * - FCP (First Contentful Paint): Supplementary metric
 * - TTFB (Time to First Byte): Supplementary metric
 */

import type { CLSMetric, FCPMetric, INPMetric, LCPMetric, TTFBMetric } from "web-vitals";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import { getCurrentConsentState } from "../consent/google-consent-mode";

type WebVitalMetric = LCPMetric | INPMetric | CLSMetric | FCPMetric | TTFBMetric;

interface WebVitalsEventParams {
	metric_name: string;
	value: number;
	rating: "good" | "needs-improvement" | "poor";
	delta: number;
	navigation_type: string;
	metric_id: string;
}

/**
 * Check if analytics consent is granted
 */
function hasAnalyticsConsent(): boolean {
	const consentState = getCurrentConsentState();
	return consentState?.analytics === true;
}

/**
 * Send Web Vitals metric to Google Analytics 4
 */
function sendToGA4(metric: WebVitalMetric): void {
	if (typeof window === "undefined" || !window.gtag) {
		return;
	}

	if (!hasAnalyticsConsent()) {
		return;
	}

	const eventParams: WebVitalsEventParams = {
		metric_name: metric.name,
		value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
		rating: metric.rating,
		delta: Math.round(metric.name === "CLS" ? metric.delta * 1000 : metric.delta),
		navigation_type: metric.navigationType,
		metric_id: metric.id,
	};

	window.gtag("event", "web_vitals", eventParams);
}

/**
 * Initialize Web Vitals monitoring
 * Call this once on page load
 */
export function initWebVitals(): void {
	if (typeof window === "undefined") {
		return;
	}

	onLCP(sendToGA4);
	onINP(sendToGA4);
	onCLS(sendToGA4);
	onFCP(sendToGA4);
	onTTFB(sendToGA4);
}

/**
 * Web Vitals thresholds for reference
 */
export const WEB_VITALS_THRESHOLDS = {
	LCP: { good: 2500, poor: 4000 },
	INP: { good: 200, poor: 500 },
	CLS: { good: 0.1, poor: 0.25 },
	FCP: { good: 1800, poor: 3000 },
	TTFB: { good: 800, poor: 1800 },
} as const;
