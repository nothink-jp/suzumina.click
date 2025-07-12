"use client";

import { useEffect, useState } from "react";
import { useIsClient } from "@/hooks/useIsClient";
import type { ConsentState } from "@/lib/consent/google-consent-mode";

/**
 * Development helper to debug consent state
 * Only shows in development mode
 */
export function ConsentDebugger() {
	const isClient = useIsClient();
	const [consentState, setConsentState] = useState<ConsentState | null>(null);
	const [consentDate, setConsentDate] = useState<string | null>(null);
	const [gtag, setGtag] = useState<boolean>(false);

	useEffect(() => {
		// Load consent state from localStorage
		const updateConsentState = () => {
			// Check if gtag is available
			setGtag(typeof window !== "undefined" && "gtag" in window);
			try {
				const savedConsent = localStorage.getItem("consent-state");
				const savedDate = localStorage.getItem("consent-state-date");

				if (savedConsent) {
					setConsentState(JSON.parse(savedConsent));
				} else {
					setConsentState(null);
				}

				setConsentDate(savedDate);
			} catch (error) {
				// Silent fail for consent state loading
			}
		};

		updateConsentState();

		// Listen for consent updates
		const handleConsentUpdate = (event: CustomEvent) => {
			setConsentState(event.detail);
			setConsentDate(new Date().toISOString());
		};

		// Listen for storage changes (in case consent is saved in another tab)
		const handleStorageChange = (event: StorageEvent) => {
			if (event.key === "consent-state") {
				updateConsentState();
			}
		};

		window.addEventListener("consentUpdate", handleConsentUpdate as EventListener);
		window.addEventListener("storage", handleStorageChange);

		// Also listen for any changes in localStorage with a periodic check
		const checkInterval = setInterval(updateConsentState, 1000);

		return () => {
			window.removeEventListener("consentUpdate", handleConsentUpdate as EventListener);
			window.removeEventListener("storage", handleStorageChange);
			clearInterval(checkInterval);
		};
	}, []);

	// Only show in development and after client-side hydration
	if (process.env.NODE_ENV !== "development" || !isClient) {
		return null;
	}

	return (
		<div className="fixed bottom-4 right-4 z-[100] bg-black/80 text-white text-xs p-3 rounded-lg max-w-sm">
			<h3 className="font-bold mb-2">🍪 Consent Debug</h3>
			<div className="space-y-1">
				<div>gtag: {gtag ? "✅" : "❌"}</div>
				<div>GA ID: {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "❌"}</div>
				<div>GTM ID: {process.env.NEXT_PUBLIC_GTM_ID || "❌"}</div>
				{consentState ? (
					<div>
						<div>Functional: {consentState.functional ? "✅" : "❌"}</div>
						<div>Analytics: {consentState.analytics ? "✅" : "❌"}</div>
						<div>Advertising: {consentState.advertising ? "✅" : "❌"}</div>
						{consentState.personalization !== undefined && (
							<div>Personalization: {consentState.personalization ? "✅" : "❌"}</div>
						)}
					</div>
				) : (
					<div>No consent given</div>
				)}
				{consentDate && (
					<div className="text-xs opacity-70">Saved: {new Date(consentDate).toLocaleString()}</div>
				)}
			</div>
		</div>
	);
}
