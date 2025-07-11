"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Settings } from "lucide-react";
import { useState } from "react";

/**
 * Cookie settings link component for footer and other locations
 * Allows users to modify their consent choices at any time
 */
export function CookieSettingsLink() {
	const [_showSettings, setShowSettings] = useState(false);

	const handleOpenSettings = () => {
		// Temporarily remove existing consent to show the banner again
		const currentConsent = localStorage.getItem("consent-state");
		if (currentConsent) {
			localStorage.setItem("consent-state-backup", currentConsent);
			localStorage.removeItem("consent-state");
			localStorage.removeItem("consent-state-date");
		}

		setShowSettings(true);

		// Trigger a page reload to show the consent banner
		window.location.reload();
	};

	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={handleOpenSettings}
			className="text-xs text-minase-300 hover:text-minase-50 p-0 h-auto hover:bg-minase-700/50 transition-colors"
		>
			<Settings className="h-3 w-3 mr-1" />
			クッキー設定
		</Button>
	);
}
