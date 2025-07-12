"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Settings } from "lucide-react";
import { useState } from "react";
import type { ConsentState } from "@/lib/consent/google-consent-mode";
import { updateConsent } from "@/lib/consent/google-consent-mode";
import { CookiePreferencesPanel } from "./CookiePreferencesPanel";

/**
 * Cookie settings link component for footer and other locations
 * Allows users to modify their consent choices at any time
 */
export function CookieSettingsLink() {
	const [showSettings, setShowSettings] = useState(false);

	const handleOpenSettings = () => {
		setShowSettings(true);
	};

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
				className="text-xs text-minase-300 hover:text-minase-50 p-0 h-auto hover:bg-minase-700/50 transition-colors"
			>
				<Settings className="h-3 w-3 mr-1" />
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
