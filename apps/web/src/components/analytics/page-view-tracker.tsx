"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { sendGoogleAnalyticsPageView } from "@/lib/consent/google-consent-mode";

/**
 * Client-side page view tracker for Google Analytics
 * Respects user consent preferences
 */
export function PageViewTracker() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		// Send page view on route change
		if (pathname) {
			const url = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
			sendGoogleAnalyticsPageView(url);
		}
	}, [pathname, searchParams]);

	// This component doesn't render anything
	return null;
}
