import Script from "next/script";

/**
 * Google Analytics 4 Script Component
 * Integrates with Google Consent Mode for privacy compliance
 */
export function GoogleAnalyticsScript() {
	const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

	// Don't render if measurement ID is not configured
	if (!measurementId) {
		if (process.env.NODE_ENV === "development") {
			console.warn("Google Analytics Measurement ID not configured");
		}
		return null;
	}

	if (process.env.NODE_ENV === "development") {
		console.log("Google Analytics Script loading with ID:", measurementId);
	}

	return (
		<>
			{/* Google Analytics 4 Script */}
			<Script
				strategy="afterInteractive"
				src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
			/>
			<Script
				id="google-analytics"
				strategy="afterInteractive"
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
