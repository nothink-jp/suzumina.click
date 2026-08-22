"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { sendGoogleAnalyticsPageView } from "@/lib/consent/google-consent-mode";

/**
 * Client-side page view tracker for Google Analytics
 *
 * GA 本体は send_page_view: false のため page view の送信元はここだけ。
 *
 * SPR-307: 「ここだけ」を成立させるために、GA4 拡張計測の「履歴の変更」も無効にしてある
 * （正本は ga4-property-settings.json の `pageChangesEnabled: false`）。
 * send_page_view が抑止するのは config 時の初回 page_view だけで、拡張計測は別経路のため、
 * ON のままだと App Router の client 遷移で page_view が二重に飛ぶ。
 *
 * SPR-299 で同意ゲートを外したので、送信可否は同意状態に依存しなくなった
 * （非同意時も cookieless ping として送られる）。
 *
 * SPR-317: 残る失敗要因は「gtag の未ロード」ではなく「`gtag('config', ...)` の未完了」。
 * GA は lazyOnload（window `load` 後）で config するのに対しこの effect は hydration 直後に
 * 走るため、**初回送信は空振りするのが常態**で、再送は gaConfigured 通知が担う。
 * 送信できたときだけ印を付ける設計は、未送信を「送信済み」と誤認して
 * landingPage を欠落させないために引き続き必要。
 *
 * SPR-307: `measurementId` は Server Component から prop で受け取る。ここで
 * `process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` を読んではいけない（クライアントでは
 * 常に undefined。理由は [ga-measurement-id.ts](@/lib/analytics/ga-measurement-id)）。
 */
export function PageViewTracker({ measurementId }: { measurementId?: string }) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const query = searchParams?.toString();
	const url = pathname ? (query ? `${pathname}?${query}` : pathname) : null;

	/** 送信済みの URL。同意トグルの往復や設定パネルからの再同意で二重計上しないための印 */
	const sentUrl = useRef<string | null>(null);

	// 送信できたときだけ印を付ける（gtag 未ロード時の no-op を「送信済み」にすると再送の機会を失う）
	const sendOnce = useCallback(
		(target: string): boolean => {
			if (sentUrl.current === target) return true;
			const sent = sendGoogleAnalyticsPageView(target, measurementId);
			if (sent) sentUrl.current = target;
			return sent;
		},
		[measurementId],
	);

	useEffect(() => {
		if (!url) return;
		if (sendOnce(url)) return;

		// まだ送れていない（gtag 未ロード、または config 未完了）。再送の契機は2つ。
		//
		// - gaConfigured: `gtag('config', ...)` の完了通知（SPR-317）。lazyOnload の GA は
		//   hydration より後に config するため、初回送信はここで空振りするのが常態。
		//   これが主たる再送契機で、consentUpdate だけだった頃は同意操作をしない訪問
		//   （＝ほぼ全部）の page_view が永久に失われていた。
		// - consentUpdate: 同意操作は gtag が動いている証拠なので保険として残す
		const retry = () => {
			sendOnce(url);
		};
		window.addEventListener("gaConfigured", retry);
		window.addEventListener("consentUpdate", retry);
		return () => {
			window.removeEventListener("gaConfigured", retry);
			window.removeEventListener("consentUpdate", retry);
		};
	}, [url, sendOnce]);

	// This component doesn't render anything
	return null;
}
