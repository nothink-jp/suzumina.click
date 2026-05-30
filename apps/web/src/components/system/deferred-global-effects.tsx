"use client";

import { lazy, Suspense, useEffect, useState } from "react";

/**
 * 全ページで mount される非クリティカルな client 副作用 / UI を、hydration 後
 * (first paint 後) に遅延ロード・遅延 hydration するための wrapper (SPR-81 WS-A)。
 *
 * 対象:
 * - PerformanceMonitor: web-vitals 初期化 (buffered PerformanceObserver のため遅延後でも計測可)
 * - PageViewTracker: GA ページビュー送信 (視覚出力なし)
 * - CookieConsentBanner: 同意未取得時のみ表示する banner (元々 isLoading で自己遅延)
 *
 * いずれも `React.lazy` で初期 bundle から chunk を分離し、`useEffect` の mounted gate で
 * hydration 後にのみ chunk import + hydration を開始する。これにより初期 hydration の
 * main-thread 占有を減らし、LCP 要素の描画を前倒しする。
 * 視覚出力が無いか自己遅延型のため CLS 影響なし。
 */

const PerformanceMonitor = lazy(() => import("@/components/system/performance-monitor"));

const PageViewTracker = lazy(() =>
	import("@/components/analytics/page-view-tracker").then((m) => ({ default: m.PageViewTracker })),
);

const CookieConsentBanner = lazy(() =>
	import("@/components/consent/cookie-consent-banner").then((m) => ({
		default: m.CookieConsentBanner,
	})),
);

export function DeferredGlobalEffects() {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	return (
		<Suspense fallback={null}>
			<PerformanceMonitor />
			<PageViewTracker />
			<CookieConsentBanner />
		</Suspense>
	);
}
