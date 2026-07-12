"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { useEffect, useState } from "react";
import type { ConsentState } from "@/lib/consent/google-consent-mode";
import { updateConsent } from "@/lib/consent/google-consent-mode";
import { CookiePreferencesPanel } from "./cookie-preferences-panel";

/**
 * フッターの Cookie 設定リンク。唯一の呼び出し元である SiteFooter の暗色帯
 * （minase-800）前提の配色にしている（他画面で流用する場合は要調整）。
 * いつでも同意設定を変更できるようにする。
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
				className="text-sm text-minase-200 hover:text-minase-50 py-2 px-3.5 h-auto underline underline-offset-4 hover:bg-transparent focus-visible:border-minase-50 focus-visible:ring-minase-50"
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
