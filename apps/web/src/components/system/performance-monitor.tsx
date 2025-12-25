"use client";

import { useEffect } from "react";
import { initWebVitals } from "../../lib/analytics/web-vitals-reporter";

/**
 * Performance Monitor Component
 *
 * Initializes Web Vitals monitoring using the official web-vitals library.
 * Metrics are sent to Google Analytics 4 as custom events.
 *
 * Measured metrics:
 * - LCP (Largest Contentful Paint)
 * - INP (Interaction to Next Paint)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 *
 * Note: Metrics are only sent when analytics consent is granted.
 */
export default function PerformanceMonitor() {
	useEffect(() => {
		initWebVitals();
	}, []);

	return null;
}
