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

/**
 * パフォーマンス監視コンポーネント
 * Core Web Vitalsと独自メトリクスを測定・送信
 */
export default function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 本番環境ではCloud Monitoringに送信、開発環境ではコンソール出力
    const reportMetric = (
      name: string,
      value: number,
      labels?: Record<string, string>,
    ) => {
      if (process.env.NODE_ENV === "production") {
        // 本番環境: カスタムメトリクスとしてサーバーに送信
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
            },
          }),
        }).catch(() => {
          // エラーは無視（監視システムの障害がアプリに影響しないように）
        });
      } else {
        // 開発環境: コンソール出力
        console.log(`[Performance] ${name}:`, value, labels);
      }
    };

    const observers: PerformanceObserver[] = [];

    // LCP (Largest Contentful Paint) の測定
    if ("PerformanceObserver" in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "largest-contentful-paint") {
            reportMetric("web_vitals_lcp", entry.startTime, {
              metric_type: "largest_contentful_paint",
            });
          }
        }
      });

      try {
        lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
        observers.push(lcpObserver);
      } catch (_e) {
        // ブラウザサポートがない場合は無視
      }

      // FID (First Input Delay) の測定
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "first-input") {
            const fid =
              (entry as PerformanceEventTiming).processingStart -
              entry.startTime;
            reportMetric("web_vitals_fid", fid, {
              metric_type: "first_input_delay",
            });
          }
        }
      });

      try {
        fidObserver.observe({ entryTypes: ["first-input"] });
        observers.push(fidObserver);
      } catch (_e) {
        // ブラウザサポートがない場合は無視
      }

      // CLS (Cumulative Layout Shift) の測定
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (
            entry.entryType === "layout-shift" &&
            !(entry as LayoutShift).hadRecentInput
          ) {
            clsValue += (entry as LayoutShift).value;
          }
        }
      });

      try {
        clsObserver.observe({ entryTypes: ["layout-shift"] });
        observers.push(clsObserver);
      } catch (_e) {
        // ブラウザサポートがない場合は無視
      }

      // ページアンロード時にCLSを報告
      const reportCLS = () => {
        if (clsValue > 0) {
          reportMetric("web_vitals_cls", clsValue, {
            metric_type: "cumulative_layout_shift",
          });
        }
      };

      window.addEventListener("beforeunload", reportCLS);
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          reportCLS();
        }
      });

      // Navigation Timing API でページロード時間を測定
      if ("performance" in window && window.performance.navigation) {
        const navigation = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        if (navigation) {
          // DNS解決時間
          const dnsTime =
            navigation.domainLookupEnd - navigation.domainLookupStart;
          reportMetric("page_load_dns_time", dnsTime, {
            metric_type: "dns_resolution",
          });

          // サーバー応答時間
          const serverTime = navigation.responseEnd - navigation.requestStart;
          reportMetric("page_load_server_time", serverTime, {
            metric_type: "server_response",
          });

          // DOMコンテンツロード時間
          const domContentLoadedTime =
            navigation.domContentLoadedEventEnd - navigation.fetchStart;
          reportMetric("page_load_dom_content_loaded", domContentLoadedTime, {
            metric_type: "dom_content_loaded",
          });

          // 完全ロード時間
          const loadTime = navigation.loadEventEnd - navigation.fetchStart;
          reportMetric("page_load_complete", loadTime, {
            metric_type: "page_load_complete",
          });
        }
      }

      // リソースロード時間の測定
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;
          const loadTime = resource.responseEnd - resource.startTime;

          // 画像とスクリプトのロード時間を特に監視
          if (
            resource.initiatorType === "img" ||
            resource.initiatorType === "script"
          ) {
            reportMetric("resource_load_time", loadTime, {
              metric_type: "resource_load",
              resource_type: resource.initiatorType,
              resource_name: resource.name.split("/").pop() || "unknown",
            });
          }
        }
      });

      try {
        resourceObserver.observe({ entryTypes: ["resource"] });
        observers.push(resourceObserver);
      } catch (_e) {
        // ブラウザサポートがない場合は無視
      }
    }

    // メモリ使用量の測定（サポートされている場合）
    const reportMemoryUsage = () => {
      if ("memory" in performance) {
        const memory = (performance as Performance & { memory: MemoryInfo })
          .memory;
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
    const memoryInterval = setInterval(reportMemoryUsage, 30000); // 30秒ごと

    return () => {
      // クリーンアップ
      for (const observer of observers) {
        observer.disconnect();
      }
      clearInterval(memoryInterval);
    };
  }, []);

  return null; // UI を表示しない
}
