"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { useEffect, useState } from "react";
import type { ConsentState } from "@/lib/consent/google-consent-mode";
import { updateConsent } from "@/lib/consent/google-consent-mode";
import { CookiePreferencesPanel } from "./cookie-preferences-panel";

/**
 * Cookie settings link component for footer and other locations
 * Allows users to modify their consent choices at any time
 */
export function CookieSettingsLink() {
	const [showSettings, setShowSettings] = useState(false);

	const handleOpenSettings = () => {
		setShowSettings(true);
	};

	// 設定ページなど他の場所からのクッキー設定開きイベントをリッスン
	useEffect(() => {
		const handleOpenCookieSettings = () => {
			setShowSettings(true);
		};

		window.addEventListener("openCookieSettings", handleOpenCookieSettings);

		return () => {
			window.removeEventListener("openCookieSettings", handleOpenCookieSettings);
		};
	}, []);

	const handleSaveSettings = (consentState: ConsentState) => {
		updateConsent(consentState);
		setShowSettings(false);

		// 設定更新のフィードバックとして、カスタムイベントを発火
		window.dispatchEvent(new CustomEvent("consentUpdate", { detail: consentState }));
	};

	const handleCloseSettings = () => {
		setShowSettings(false);
	};

	return (
		<>
			<Button
				variant="ghost"
				size="sm"
				onClick={handleOpenSettings}
				className="text-sm text-minase-200 hover:text-minase-50 py-2 px-3.5 h-auto underline underline-offset-4 hover:bg-transparent"
			>
				クッキー設定
			</Button>

			<CookiePreferencesPanel
				open={showSettings}
				onSave={handleSaveSettings}
				onCancel={handleCloseSettings}
			/>
		</>
	);
}
