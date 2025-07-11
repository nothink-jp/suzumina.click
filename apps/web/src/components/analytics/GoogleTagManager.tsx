import { Script } from "next/script";

/**
 * Google Tag Manager コンポーネント
 * プライバシー準拠のGTM実装
 */
export function GoogleTagManager() {
	const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

	if (!gtmId) {
		return null;
	}

	return (
		<>
			{/* Google Tag Manager Script */}
			<Script
				id="google-tag-manager"
				strategy="afterInteractive"
				dangerouslySetInnerHTML={{
					__html: `
						(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
						new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
						j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
						'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
						})(window,document,'script','dataLayer','${gtmId}');
					`,
				}}
			/>
		</>
	);
}

/**
 * Google Tag Manager (noscript) コンポーネント
 * JavaScript無効時のフォールバック
 */
export function GoogleTagManagerNoscript() {
	const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

	if (!gtmId) {
		return null;
	}

	return (
		<noscript>
			<iframe
				src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
				height="0"
				width="0"
				style={{ display: "none", visibility: "hidden" }}
				title="Google Tag Manager"
			/>
		</noscript>
	);
}
