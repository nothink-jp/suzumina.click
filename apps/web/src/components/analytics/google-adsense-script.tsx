import Script from "next/script";

/**
 * Google AdSense Script Component
 * Loads AdSense ads after user interaction for performance optimization
 */
export function GoogleAdSenseScript() {
	const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

	// Don't render if client ID is not configured
	if (!clientId) {
		if (process.env.NODE_ENV === "development") {
			// biome-ignore lint/suspicious/noConsole: Development logging is intentional
			console.warn("Google AdSense Client ID not configured");
		}
		return null;
	}

	if (process.env.NODE_ENV === "development") {
		// biome-ignore lint/suspicious/noConsole: Development logging is intentional
		console.log("Google AdSense Script loading with Client ID:", clientId);
	}

	return (
		<Script
			strategy="afterInteractive"
			src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
			crossOrigin="anonymous"
		/>
	);
}
