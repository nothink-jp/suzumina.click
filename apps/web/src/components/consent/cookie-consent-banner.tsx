"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent } from "@suzumina.click/ui/components/ui/card";
import { Cookie, Settings, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

export function CookieConsentBanner() {
	const isClient = useIsClient();
	const [showBanner, setShowBanner] = useState(false);
	const [showPreferences, setShowPreferences] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	// Apply consent choices using unified system
	const applyConsentChoices = useCallback((choices: ConsentState) => {
		updateConsent(choices);

		// Trigger custom event for other services to listen
		window.dispatchEvent(
			new CustomEvent("consentUpdate", {
				detail: choices,
			}),
		);
	}, []);

	const saveConsent = (choices: ConsentState) => {
		applyConsentChoices(choices);
		setShowBanner(false);
		setShowPreferences(false);
	};

	const handleAcceptAll = () => {
		saveConsent({
			functional: true,
			analytics: true,
			advertising: true,
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

		// Check if user has already made consent choices using unified system
		const savedConsent = getCurrentConsentState();

		if (savedConsent) {
			// User has already made consent choices
			applyConsentChoices(savedConsent);
			setShowBanner(false);
		} else {
			// No consent yet, show banner
			setShowBanner(true);
		}

		setIsLoading(false);
	}, [isClient, applyConsentChoices]);

	if (isLoading || !showBanner) {
		return null;
	}

	return (
		<>
			{/* Main consent banner */}
			<div className="fixed bottom-0 left-0 right-0 z-50 p-4">
				<Card className="max-w-4xl mx-auto bg-white/95 backdrop-blur-sm shadow-xl border border-gray-200">
					<CardContent className="p-4">
						<div className="flex flex-col sm:flex-row items-start gap-4">
							{/* Icon and message */}
							<div className="flex items-start gap-3 flex-1">
								<div className="p-2 bg-suzuka-100 rounded-lg">
									<Cookie className="h-5 w-5 text-suzuka-600" />
								</div>
								<div className="space-y-1">
									<h3 className="font-semibold text-gray-900 text-sm">クッキーの使用について</h3>
									<p className="text-sm text-gray-600 leading-relaxed">
										サイト改善・広告配信・分析のためクッキーを使用します。
										<button
											type="button"
											onClick={() => setShowPreferences(true)}
											className="text-suzuka-600 hover:text-suzuka-700 underline ml-1"
										>
											詳細設定
										</button>
									</p>
								</div>
							</div>

							{/* Action buttons - Equal prominence design */}
							<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
								<Button
									variant="outline"
									size="sm"
									onClick={handleRejectAll}
									className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs px-3 py-2"
								>
									拒否
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowPreferences(true)}
									className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs px-3 py-2"
								>
									<Settings className="h-3 w-3 mr-1" />
									設定
								</Button>
								<Button
									size="sm"
									onClick={handleAcceptAll}
									className="bg-suzuka-600 hover:bg-suzuka-700 text-white text-xs px-3 py-2"
								>
									すべて許可
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Preferences panel overlay */}
			{showPreferences && (
				<div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm">
					<div className="flex items-center justify-center min-h-screen p-4">
						<Card className="w-full max-w-4xl max-h-[90vh] bg-white shadow-2xl overflow-hidden">
							<div className="flex items-center justify-between p-6 border-b">
								<h2 className="text-lg font-semibold text-gray-900">クッキー設定</h2>
								<Button variant="ghost" size="sm" onClick={() => setShowPreferences(false)}>
									<X className="h-4 w-4" />
								</Button>
							</div>

							<CookiePreferencesPanel
								onSave={handleCustomConsent}
								onCancel={() => setShowPreferences(false)}
							/>
						</Card>
					</div>
				</div>
			)}
		</>
	);
}

// Extend Window interface for TypeScript
declare global {
	interface Window {
		// biome-ignore lint/suspicious/noExplicitAny: Google Analytics gtag function requires any
		gtag: (...args: any[]) => void;
	}
}
