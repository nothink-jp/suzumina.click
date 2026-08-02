/**
 * Web Vitals Reporter for Google Analytics 4
 *
 * Measures Core Web Vitals and sends them to GA4 as custom events.
 *
 * SPR-299: 送信自体は同意でゲートしない（他のイベントと同じ扱い）。Cookie/識別子を
 * 保存するかどうかだけが GA4 の consent mode 側で切り替わる。送る内容は metric 名・値・
 * 評価・navigationType だけで、訪問者を識別する要素を含まない。
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

type WebVitalMetric = LCPMetric | INPMetric | CLSMetric | FCPMetric | TTFBMetric;

// Guard to prevent multiple initializations
let isInitialized = false;

interface WebVitalsEventParams {
	metric_name: string;
	value: number;
	rating: "good" | "needs-improvement" | "poor";
	delta: number;
	navigation_type: string;
	metric_id: string;
}

/**
 * Send Web Vitals metric to Google Analytics 4
 *
 * SPR-299: 同意ゲートを外し、他のイベントと同じく GA4 の consent mode に委ねる。
 * ここだけゲートを残すと「操作の集計は同意なしで送るが、個人を識別しない性能値は送らない」
 * という逆転した線引きになる（送る内容は metric 名・値・評価・navigationType だけで、
 * 訪問者を識別する要素を含まない）。
 */
function sendToGA4(metric: WebVitalMetric): void {
	if (typeof window === "undefined" || !window.gtag) {
		return;
	}

	// CLS is a fractional value (0-1), multiply by 1000 to send as integer for GA4 compatibility
	// e.g., 0.1 → 100, 0.25 → 250
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

	// Prevent multiple initializations (e.g., from React StrictMode or re-renders)
	if (isInitialized) {
		return;
	}
	isInitialized = true;

	onLCP(sendToGA4);
	onINP(sendToGA4);
	onCLS(sendToGA4);
	onFCP(sendToGA4);
	onTTFB(sendToGA4);
}
