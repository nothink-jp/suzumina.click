import Script from "next/script";
import { getGaMeasurementId } from "@/lib/analytics/ga-measurement-id";

/**
 * Google Analytics 4 Script Component
 * Integrates with Google Consent Mode for privacy compliance
 */
export function GoogleAnalyticsScript() {
	const measurementId = getGaMeasurementId();

	// Don't render if measurement ID is not configured
	if (!measurementId) {
		return null;
	}

	return (
		<>
			{/* Google Analytics 4 Script
			 * lazyOnload で `load` 後にロードし、Mobile LCP への影響を抑える (SPR-9)。
			 * Consent Mode の default は ConsentModeScript の useEffect で hydration 直後に
			 * dataLayer に push 済み。GA 本体は send_page_view: false で、page view は
			 * PageViewTracker から手動送信する。
			 *
			 * SPR-317: この `config` は hydration より後に走る（lazyOnload = window `load` 後）。
			 * 一方 PageViewTracker は hydration 直後に送るため、放置すると page_view が
			 * `config` より前に dataLayer へ積まれる＝送信先未設定のまま捨てられる。
			 * 下の `gaConfigured` はその順序を送信側に伝えるための印。 */}
			<Script
				strategy="lazyOnload"
				src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
			/>
			<Script
				id="google-analytics"
				strategy="lazyOnload"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: env 由来の measurementId を埋め込む標準の GA ブートストラップ（ユーザー入力なし）
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
						// SPR-317: config 完了を送信側へ伝える。window.gtag は ConsentModeScript の
						// polyfill が hydration 時に定義済みなので、gtag の有無では順序を判別できない。
						window.gaConfigured = true;
						window.dispatchEvent(new Event('gaConfigured'));
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
