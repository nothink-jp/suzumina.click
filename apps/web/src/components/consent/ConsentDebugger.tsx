"use client";

import { useEffect, useState } from "react";

interface ConsentState {
	necessary: boolean;
	analytics: boolean;
	advertising: boolean;
	personalization: boolean;
}

/**
 * Development helper to debug consent state
 * Only shows in development mode
 */
export function ConsentDebugger() {
	const [consentState, setConsentState] = useState<ConsentState | null>(null);
	const [consentDate, setConsentDate] = useState<string | null>(null);
	const [gtag, setGtag] = useState<boolean>(false);

	useEffect(() => {
		// Check if gtag is available
		setGtag(typeof window !== "undefined" && "gtag" in window);

		// Load consent state from localStorage
		const updateConsentState = () => {
			try {
				const savedConsent = localStorage.getItem("cookie-consent");
				const savedDate = localStorage.getItem("cookie-consent-date");

				if (savedConsent) {
					setConsentState(JSON.parse(savedConsent));
				} else {
					setConsentState(null);
				}

				setConsentDate(savedDate);
			} catch (error) {
				console.error("Failed to load consent state:", error);
			}
		};

		updateConsentState();

		// Listen for consent updates
		const handleConsentUpdate = (event: CustomEvent) => {
			setConsentState(event.detail);
			setConsentDate(new Date().toISOString());
		};

		window.addEventListener("consentUpdate", handleConsentUpdate as EventListener);

		return () => {
			window.removeEventListener("consentUpdate", handleConsentUpdate as EventListener);
		};
	}, []);

	// Only show in development
	if (process.env.NODE_ENV !== "development") {
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
						<div>Analytics: {consentState.analytics ? "✅" : "❌"}</div>
						<div>Advertising: {consentState.advertising ? "✅" : "❌"}</div>
						<div>Personalization: {consentState.personalization ? "✅" : "❌"}</div>
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
