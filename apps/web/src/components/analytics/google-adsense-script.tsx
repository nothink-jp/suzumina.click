import Script from "next/script";
import { info as logInfo, warn as logWarn } from "@/lib/logger";

/**
 * Google AdSense Script Component
 * Loads AdSense ads for monetization
 */
export function GoogleAdSenseScript() {
	const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

	// Don't render if client ID is not configured
	if (!clientId) {
		if (process.env.NODE_ENV === "development") {
			logWarn("Google AdSense Client ID not configured");
		}
		return null;
	}

	if (process.env.NODE_ENV === "development") {
		logInfo("Google AdSense Script loading with Client ID:", { clientId });
	}

	return (
		<Script
			id="google-ad-sense"
			strategy="afterInteractive"
			dangerouslySetInnerHTML={{
				__html: `
					(function() {
						var script = document.createElement('script');
						script.async = true;
						script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}';
						script.crossOrigin = 'anonymous';
						document.head.appendChild(script);
					})();
				`,
			}}
		/>
	);
}
