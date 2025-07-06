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
		const currentConsent = localStorage.getItem("cookie-consent");
		if (currentConsent) {
			localStorage.setItem("cookie-consent-backup", currentConsent);
			localStorage.removeItem("cookie-consent");
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
			className="text-xs text-gray-500 hover:text-gray-700 p-0 h-auto"
		>
			<Settings className="h-3 w-3 mr-1" />
			クッキー設定
		</Button>
	);
}
