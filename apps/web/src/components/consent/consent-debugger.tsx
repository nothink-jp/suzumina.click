"use client";

import { useEffect, useState } from "react";
import { useIsClient } from "@/hooks/use-is-client";
import type { ConsentState } from "@/lib/consent/google-consent-mode";

// ヘルパー関数：localStorage から同意状態を読み込み
function loadConsentStateFromStorage(): {
	consentState: ConsentState | null;
	consentDate: string | null;
} {
	try {
		const savedConsent = localStorage.getItem("consent-state");
		const savedDate = localStorage.getItem("consent-state-date");

		const consentState = savedConsent ? JSON.parse(savedConsent) : null;
		return { consentState, consentDate: savedDate };
	} catch (_error) {
		return { consentState: null, consentDate: null };
	}
}

// ヘルパー関数：gtagの利用可能性チェック
function checkGtagAvailability(): boolean {
	return typeof window !== "undefined" && "gtag" in window;
}

// ヘルパー関数：環境変数情報の取得
function getEnvironmentInfo() {
	return {
		gaId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "❌",
		gtmId: process.env.NEXT_PUBLIC_GTM_ID || "❌",
	};
}

// ヘルパー関数：同意状態の表示コンポーネント
function ConsentStateDisplay({ consentState }: { consentState: ConsentState | null }) {
	if (!consentState) {
		return <div>No consent given</div>;
	}

	return (
		<div>
			<div>Functional: {consentState.functional ? "✅" : "❌"}</div>
			<div>Analytics: {consentState.analytics ? "✅" : "❌"}</div>
			<div>Advertising: {consentState.advertising ? "✅" : "❌"}</div>
			{consentState.personalization !== undefined && (
				<div>Personalization: {consentState.personalization ? "✅" : "❌"}</div>
			)}
		</div>
	);
}

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
		// 同意状態を更新する関数
		const updateConsentState = () => {
			setGtag(checkGtagAvailability());
			const { consentState: loadedState, consentDate: loadedDate } = loadConsentStateFromStorage();
			setConsentState(loadedState);
			setConsentDate(loadedDate);
		};

		// 初期状態の読み込み
		updateConsentState();

		// イベントリスナーの設定
		const handleConsentUpdate = (event: CustomEvent) => {
			setConsentState(event.detail);
			setConsentDate(new Date().toISOString());
		};

		const handleStorageChange = (event: StorageEvent) => {
			if (event.key === "consent-state") {
				updateConsentState();
			}
		};

		// イベントリスナーの追加
		window.addEventListener("consentUpdate", handleConsentUpdate as EventListener);
		window.addEventListener("storage", handleStorageChange);
		const checkInterval = setInterval(updateConsentState, 1000);

		// クリーンアップ
		return () => {
			window.removeEventListener("consentUpdate", handleConsentUpdate as EventListener);
			window.removeEventListener("storage", handleStorageChange);
			clearInterval(checkInterval);
		};
	}, []);

	// 開発環境とクライアントサイド以外では表示しない
	if (process.env.NODE_ENV !== "development" || !isClient) {
		return null;
	}

	const { gaId, gtmId } = getEnvironmentInfo();

	return (
		<div className="fixed bottom-4 right-4 z-[100] bg-black/80 text-white text-xs p-3 rounded-lg max-w-sm">
			<h3 className="font-bold mb-2">🍪 Consent Debug</h3>
			<div className="space-y-1">
				<div>gtag: {gtag ? "✅" : "❌"}</div>
				<div>GA ID: {gaId}</div>
				<div>GTM ID: {gtmId}</div>
				<ConsentStateDisplay consentState={consentState} />
				{consentDate && (
					<div className="text-xs opacity-70">Saved: {new Date(consentDate).toLocaleString()}</div>
				)}
			</div>
		</div>
	);
}
