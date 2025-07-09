"use client";

import { useEffect } from "react";

// TypeScript definitions for performance APIs
interface LayoutShift extends PerformanceEntry {
	value: number;
	hadRecentInput: boolean;
}

interface MemoryInfo {
	usedJSHeapSize: number;
	totalJSHeapSize: number;
	jsHeapSizeLimit: number;
}

// サンプリングレート（10%のユーザーのみメトリクス送信）
const SAMPLING_RATE = 0.1;

// メトリクス送信関数
function createMetricReporter() {
	// ユーザーセッション毎のサンプリング判定（一度決まったら継続）
	const shouldSample = Math.random() < SAMPLING_RATE;

	return (name: string, value: number, labels?: Record<string, string>) => {
		if (process.env.NODE_ENV === "production" && shouldSample) {
			// 本番環境かつサンプリング対象の場合のみ送信
			fetch("/api/metrics", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name,
					value,
					labels: {
						...labels,
						userAgent: navigator.userAgent,
						url: window.location.pathname,
						sampled: "true",
					},
				}),
			}).catch(() => {
				// エラーは無視（監視システムの障害がアプリに影響しないように）
			});
		}
		// 開発環境またはサンプリング対象外では何もしない
	};
}

// LCP (Largest Contentful Paint) の測定
function setupLCPObserver(
	reportMetric: ReturnType<typeof createMetricReporter>,
): PerformanceObserver | null {
	try {
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.entryType === "largest-contentful-paint") {
					reportMetric("web_vitals_lcp", entry.startTime, {
						metric_type: "largest_contentful_paint",
					});
				}
			}
		});
		observer.observe({ entryTypes: ["largest-contentful-paint"] });
		return observer;
	} catch {
		return null;
	}
}

// FID (First Input Delay) の測定
function setupFIDObserver(
	reportMetric: ReturnType<typeof createMetricReporter>,
): PerformanceObserver | null {
	try {
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.entryType === "first-input") {
					const fid = (entry as PerformanceEventTiming).processingStart - entry.startTime;
					reportMetric("web_vitals_fid", fid, {
						metric_type: "first_input_delay",
					});
				}
			}
		});
		observer.observe({ entryTypes: ["first-input"] });
		return observer;
	} catch {
		return null;
	}
}

// CLS (Cumulative Layout Shift) の測定
function setupCLSObserver(reportMetric: ReturnType<typeof createMetricReporter>): {
	observer: PerformanceObserver | null;
	cleanup: () => void;
} {
	let clsValue = 0;

	const reportCLS = () => {
		if (clsValue > 0) {
			reportMetric("web_vitals_cls", clsValue, {
				metric_type: "cumulative_layout_shift",
			});
		}
	};

	let observer: PerformanceObserver | null = null;

	try {
		observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.entryType === "layout-shift" && !(entry as LayoutShift).hadRecentInput) {
					clsValue += (entry as LayoutShift).value;
				}
			}
		});
		observer.observe({ entryTypes: ["layout-shift"] });
	} catch {
		observer = null;
	}

	// イベントリスナーの設定
	window.addEventListener("beforeunload", reportCLS);
	const handleVisibilityChange = () => {
		if (document.visibilityState === "hidden") {
			reportCLS();
		}
	};
	window.addEventListener("visibilitychange", handleVisibilityChange);

	const cleanup = () => {
		window.removeEventListener("beforeunload", reportCLS);
		window.removeEventListener("visibilitychange", handleVisibilityChange);
	};

	return { observer, cleanup };
}

// Navigation Timing の測定
function setupNavigationTiming(reportMetric: ReturnType<typeof createMetricReporter>) {
	if (!("performance" in window) || !window.performance.navigation) {
		return;
	}

	const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
	if (!navigation) {
		return;
	}

	// DNS解決時間
	const dnsTime = navigation.domainLookupEnd - navigation.domainLookupStart;
	reportMetric("page_load_dns_time", dnsTime, { metric_type: "dns_resolution" });

	// サーバー応答時間
	const serverTime = navigation.responseEnd - navigation.requestStart;
	reportMetric("page_load_server_time", serverTime, { metric_type: "server_response" });

	// DOMコンテンツロード時間
	const domContentLoadedTime = navigation.domContentLoadedEventEnd - navigation.fetchStart;
	reportMetric("page_load_dom_content_loaded", domContentLoadedTime, {
		metric_type: "dom_content_loaded",
	});

	// 完全ロード時間
	const loadTime = navigation.loadEventEnd - navigation.fetchStart;
	reportMetric("page_load_complete", loadTime, { metric_type: "page_load_complete" });
}

// リソースロード時間の測定
function setupResourceObserver(
	reportMetric: ReturnType<typeof createMetricReporter>,
): PerformanceObserver | null {
	try {
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				const resource = entry as PerformanceResourceTiming;
				const loadTime = resource.responseEnd - resource.startTime;

				// 画像とスクリプトのロード時間を特に監視（遅いもののみ）
				if (
					(resource.initiatorType === "img" || resource.initiatorType === "script") &&
					loadTime > 1000
				) {
					reportMetric("resource_load_time", loadTime, {
						metric_type: "resource_load",
						resource_type: resource.initiatorType,
						resource_name: resource.name.split("/").pop() || "unknown",
					});
				}
			}
		});
		observer.observe({ entryTypes: ["resource"] });
		return observer;
	} catch {
		return null;
	}
}

// メモリ使用量の測定
function setupMemoryMonitoring(reportMetric: ReturnType<typeof createMetricReporter>): () => void {
	const reportMemoryUsage = () => {
		if ("memory" in performance) {
			const memory = (performance as Performance & { memory: MemoryInfo }).memory;
			reportMetric("browser_memory_used", memory.usedJSHeapSize, {
				metric_type: "memory_usage",
				memory_type: "used_heap",
			});
			reportMetric("browser_memory_total", memory.totalJSHeapSize, {
				metric_type: "memory_usage",
				memory_type: "total_heap",
			});
		}
	};

	// 初回測定とその後定期測定
	reportMemoryUsage();
	const interval = setInterval(reportMemoryUsage, 300000); // 5分ごとに変更

	return () => clearInterval(interval);
}

/**
 * パフォーマンス監視コンポーネント
 * Core Web Vitalsと独自メトリクスを測定・送信
 */
export default function PerformanceMonitor() {
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		// Performance Observer がサポートされていない場合は何もしない
		if (!("PerformanceObserver" in window)) {
			return;
		}

		const reportMetric = createMetricReporter();
		const observers: (PerformanceObserver | null)[] = [];
		const cleanupFunctions: (() => void)[] = [];

		// 各監視機能をセットアップ
		observers.push(setupLCPObserver(reportMetric));
		observers.push(setupFIDObserver(reportMetric));

		const { observer: clsObserver, cleanup: clsCleanup } = setupCLSObserver(reportMetric);
		observers.push(clsObserver);
		cleanupFunctions.push(clsCleanup);

		setupNavigationTiming(reportMetric);
		observers.push(setupResourceObserver(reportMetric));

		const memoryCleanup = setupMemoryMonitoring(reportMetric);
		cleanupFunctions.push(memoryCleanup);

		return () => {
			// すべてのオブザーバーを停止
			for (const observer of observers) {
				if (observer) {
					observer.disconnect();
				}
			}

			// すべてのクリーンアップ関数を実行
			for (const cleanup of cleanupFunctions) {
				cleanup();
			}
		};
	}, []);

	return null; // UI を表示しない
}
