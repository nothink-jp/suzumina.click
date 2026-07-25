"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { sendGoogleAnalyticsPageView } from "@/lib/consent/google-consent-mode";

/**
 * Client-side page view tracker for Google Analytics
 * Respects user consent preferences
 *
 * GA 本体は send_page_view: false のため page view の送信元はここだけ。同意前のロードでは
 * 送信できないので、バナー/設定パネルの同意反映（consentUpdate）を待って、その時点で
 * 開いているページ分を送る。これが無いと同意した訪問の初回ページが永久に欠落し、
 * GA4 の landingPage が (not set)・PV がユーザー数を下回る壊れた指標になる。
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
