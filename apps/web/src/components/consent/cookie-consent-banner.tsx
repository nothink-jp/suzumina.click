"use client";

import { DockedPanel } from "@suzumina.click/ui/components/custom";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Cookie } from "lucide-react";
import { useEffect, useState } from "react";
import { useAgeVerification } from "@/contexts/age-verification-context";
import { useIsClient } from "@/hooks/use-is-client";
import {
	type ConsentState,
	getCurrentConsentState,
	updateConsent,
} from "@/lib/consent/google-consent-mode";
import { CookiePreferencesPanel } from "./cookie-preferences-panel";

// ConsentStateを使用してgoogle-consent-mode.tsと統一
const DEFAULT_CONSENT: ConsentState = {
	functional: true, // Always required
	analytics: false,
	advertising: false,
	personalization: false,
};

const NARROW_VIEWPORT_QUERY = "(max-width: 639px)";

/** 同意の確定を他のクライアント機能へ通知する（page_view の再送契機など） */
function notifyConsentUpdate(choices: ConsentState) {
	window.dispatchEvent(new CustomEvent("consentUpdate", { detail: choices }));
}

/**
 * 案A: 左下に独立して浮く非モーダルなピル型バー（年齢確認カードは右下・重ならない）。
 * 狭い画面では両方が全幅ボトムシート化しうるため、年齢確認カードがドック占有中
 * （ask/toast段階）の間はこのバーを抑制し、順次表示にする。読むのは
 * AgeVerificationProvider の isAgeCardDocked（読み取り専用シグナル）だけで、
 * 状態の所有権は移さない。
 */
export function CookieConsentBanner() {
	const isClient = useIsClient();
	const { isAgeCardDocked } = useAgeVerification();
	const [isNarrowViewport, setIsNarrowViewport] = useState(false);
	const [showBanner, setShowBanner] = useState(false);
	const [showPreferences, setShowPreferences] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const mediaQuery = window.matchMedia(NARROW_VIEWPORT_QUERY);
		const update = () => setIsNarrowViewport(mediaQuery.matches);
		update();
		mediaQuery.addEventListener("change", update);
		return () => mediaQuery.removeEventListener("change", update);
	}, []);

	const saveConsent = (choices: ConsentState) => {
		updateConsent(choices);
		notifyConsentUpdate(choices);
		setShowBanner(false);
		setShowPreferences(false);
	};

	const handleAcceptAll = () => {
		saveConsent({
			functional: true,
			analytics: true,
			advertising: false,
			personalization: true,
		});
	};

	const handleRejectAll = () => {
		saveConsent(DEFAULT_CONSENT);
	};

	const handleCustomConsent = (choices: ConsentState) => {
		saveConsent(choices);
	};

	useEffect(() => {
		// Only run on client side
		if (!isClient) return;

		// 有効な同意が保存済みか（期限切れは null＝未同意扱いで再確認へ）
		const savedConsent = getCurrentConsentState();

		if (savedConsent) {
			// SPR-280: 保存済み同意の gtag への反映は ConsentModeScript（layout に常設）が
			// 済ませている。ここで updateConsent を呼ぶと (1) 同じ consent update の二重 push、
			// (2) ユーザー操作でないのに consent_update イベントの送信、
			// (3) consent-state-date の更新で1年の再確認が永久に来ない、の3つが起きていた。
			// 残すのは DOM イベントの通知だけ（page_view 再送の契機・page-view-tracker.tsx）。
			notifyConsentUpdate(savedConsent);
			setShowBanner(false);
		} else {
			// No consent yet, show banner
			setShowBanner(true);
		}

		setIsLoading(false);
	}, [isClient]);

	// 狭い画面では年齢確認カードのドック占有中（ask/toast）は出さず、決着後に表示する（順次表示）
	const deferredForMobileAgeGate = isNarrowViewport && isAgeCardDocked;

	if (isLoading || !showBanner || deferredForMobileAgeGate) {
		return null;
	}

	return (
		<>
			<DockedPanel
				position="bottom-left"
				variant="pill"
				aria-label="クッキーの使用"
				className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:py-2 sm:pr-2 sm:pl-4"
			>
				<Cookie className="h-4 w-4 flex-shrink-0 text-primary" />
				<span className="min-w-0 flex-1 text-xs text-foreground sm:flex-none sm:whitespace-nowrap">
					サイト改善のためクッキーを使用します
				</span>
				<button
					type="button"
					onClick={() => setShowPreferences(true)}
					className="whitespace-nowrap text-xs text-primary underline"
				>
					詳細設定
				</button>
				<div className="flex w-full gap-2 sm:w-auto">
					<Button
						variant="outline"
						size="sm"
						onClick={handleRejectAll}
						className="flex-1 sm:flex-none"
					>
						拒否
					</Button>
					<Button size="sm" onClick={handleAcceptAll} className="flex-1 sm:flex-none">
						許可
					</Button>
				</div>
			</DockedPanel>

			{/* Preferences panel - use Dialog component directly */}
			<CookiePreferencesPanel
				open={showPreferences}
				onSave={handleCustomConsent}
				onCancel={() => setShowPreferences(false)}
			/>
		</>
	);
}

// Types are imported from google-consent-mode.ts
