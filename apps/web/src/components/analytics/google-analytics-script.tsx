import Script from "next/script";
import { info as logInfo, warn as logWarn } from "@/lib/logger";

/**
 * Google Analytics 4 Script Component
 * Integrates with Google Consent Mode for privacy compliance
 */
export function GoogleAnalyticsScript() {
	const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

	// Don't render if measurement ID is not configured
	if (!measurementId) {
		if (process.env.NODE_ENV === "development") {
			logWarn("Google Analytics Measurement ID not configured");
		}
		return null;
	}

	if (process.env.NODE_ENV === "development") {
		logInfo("Google Analytics Script loading with ID:", { measurementId });
	}

	return (
		<>
			{/* Google Analytics 4 Script
			 * lazyOnload で `load` 後にロードし、Mobile LCP への影響を抑える (SPR-9)。
			 * Consent Mode の default は ConsentModeScript の useEffect で hydration 直後に
			 * dataLayer に push 済み。GA 本体は send_page_view: false で、page view は
			 * PageViewTracker から手動送信するため、ロード順序の遅延は
			 * 計測結果の整合性に影響しない。 */}
			<Script
				strategy="lazyOnload"
				src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
			/>
			<Script
				id="google-analytics"
				strategy="lazyOnload"
				dangerouslySetInnerHTML={{
					__html: `
						window.dataLayer = window.dataLayer || [];
						function gtag(){dataLayer.push(arguments);}
						gtag('js', new Date());
						gtag('config', '${measurementId}', {
							page_title: document.title,
							page_location: window.location.href,
							send_page_view: false  // We'll manually control page views based on consent
						});
						// Debug: Log GA initialization in development only
						if (window.location.hostname === 'localhost') {
							console.log('Google Analytics initialized with ID:', '${measurementId}');
						}
					`,
				}}
			/>
		</>
	);
}
