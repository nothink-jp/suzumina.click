"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { sendGoogleAnalyticsPageView } from "@/lib/consent/google-consent-mode";

/**
 * Client-side page view tracker for Google Analytics
 *
 * GA 本体は send_page_view: false のため page view の送信元はここだけ。
 *
 * SPR-299 で同意ゲートを外したので、送信可否は同意状態に依存しなくなった
 * （非同意時も cookieless ping として送られる）。残る失敗要因は gtag の未ロードだけで、
 * consentUpdate の再送はその取りこぼしに対する保険として残している
 * （同意バナーの操作は gtag が動いている証拠になるため、再試行の契機として有効）。
 * 送信できたときだけ印を付ける設計は、未送信を「送信済み」と誤認して
 * landingPage を欠落させないために引き続き必要。
 */
export function PageViewTracker() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const query = searchParams?.toString();
	const url = pathname ? (query ? `${pathname}?${query}` : pathname) : null;

	/** 送信済みの URL。同意トグルの往復や設定パネルからの再同意で二重計上しないための印 */
	const sentUrl = useRef<string | null>(null);

	// 送信できたときだけ印を付ける（同意前の no-op を「送信済み」にすると再送の機会を失う）
	const sendOnce = useCallback((target: string): boolean => {
		if (sentUrl.current === target) return true;
		const sent = sendGoogleAnalyticsPageView(target);
		if (sent) sentUrl.current = target;
		return sent;
	}, []);

	useEffect(() => {
		if (!url) return;
		if (sendOnce(url)) return;

		// 未同意。同意が反映された時点で、その時開いているページを送る
		const handleConsentUpdate = () => {
			sendOnce(url);
		};
		window.addEventListener("consentUpdate", handleConsentUpdate);
		return () => window.removeEventListener("consentUpdate", handleConsentUpdate);
	}, [url, sendOnce]);

	// This component doesn't render anything
	return null;
}
