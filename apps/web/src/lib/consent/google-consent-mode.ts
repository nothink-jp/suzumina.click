/**
 * Google Consent Mode v2 implementation
 * Manages consent state for Google Analytics
 */

// Google Analytics gtag types
type GtagCommand = "config" | "consent" | "event" | "set";
type GtagConfigParams = Record<string, string | number | boolean>;
type ConsentParams = {
	ad_storage?: "granted" | "denied";
	ad_user_data?: "granted" | "denied";
	ad_personalization?: "granted" | "denied";
	analytics_storage?: "granted" | "denied";
	functionality_storage?: "granted" | "denied";
	personalization_storage?: "granted" | "denied";
	security_storage?: "granted" | "denied";
	wait_for_update?: number;
};

type DataLayerEvent =
	| [GtagCommand, "default", ConsentParams]
	| [GtagCommand, "update", ConsentParams]
	| [GtagCommand, string, GtagConfigParams?]
	| [GtagCommand, string, string, GtagConfigParams?]
	| unknown[];

declare global {
	interface Window {
		gtag: (command: GtagCommand, ...args: unknown[]) => void;
		dataLayer: DataLayerEvent[];
	}
}

export interface ConsentState {
	necessary?: boolean;
	analytics: boolean;
	advertising: boolean;
	functional: boolean;
	personalization: boolean;
}

/**
 * 保存済みの任意値を ConsentState に正規化する（`functional` の既定は true）
 *
 * localStorage から読む経路が複数あるため（このファイルの getCurrentConsentState と、
 * hydration 前に走る consent-mode-script.tsx）、解釈のズレを避けて正本をここに置く。
 */
export function normalizeConsentState(saved: unknown): ConsentState {
	const source = (saved ?? {}) as Partial<Record<keyof ConsentState, unknown>>;
	return {
		analytics: source.analytics === true,
		advertising: source.advertising === true,
		functional: source.functional !== false,
		personalization: source.personalization === true,
	};
}

/**
 * ConsentState → Google Consent Mode v2 パラメータの対応（正本）
 *
 * SPR-280: `ad_personalization` は「広告のパーソナライズ」なので advertising 駆動にする。
 * personalization カテゴリが駆動するのは GA のコンテンツ・パーソナライズ
 * （`personalization_storage`）だけで、両者は別物。以前は ad_personalization を
 * personalization で駆動していたため、「広告を拒否したのに ad_personalization: granted」
 * という、カテゴリ名から予測できない状態になっていた。
 */
function toGoogleConsentParams(consentState: ConsentState): ConsentParams {
	const advertising = consentState.advertising ? "granted" : "denied";
	return {
		ad_storage: advertising,
		ad_user_data: advertising,
		ad_personalization: advertising,
		analytics_storage: consentState.analytics ? "granted" : "denied",
		functionality_storage: consentState.functional ? "granted" : "denied",
		personalization_storage: consentState.personalization ? "granted" : "denied",
	};
}

/**
 * 同意状態を gtag に反映する（`consent update` の push のみ・イベントは送らない）
 *
 * 保存済み同意の復元時にも使うため、ユーザー操作を表す `consent_update` イベントは
 * 含めない（そちらは updateGoogleConsent の責務）。
 */
export function applyGoogleConsent(consentState: ConsentState) {
	if (typeof window === "undefined" || !window.gtag) return;

	window.gtag("consent", "update", toGoogleConsentParams(consentState));
}

/**
 * Update consent choices and notify Google services
 */
export function updateGoogleConsent(consentState: ConsentState) {
	if (typeof window === "undefined" || !window.gtag) return;

	applyGoogleConsent(consentState);

	// Send custom event for tracking consent changes
	window.gtag("event", "consent_update", {
		consent_analytics: consentState.analytics,
		consent_advertising: consentState.advertising,
		consent_personalization: consentState.personalization,
	});
}

/**
 * 保存済み同意の有効期間（1年）。クッキー設定パネルの「設定は1年間保存され、
 * 期限後に再確認をお願いします」という記述がこの値の対外的な約束にあたる。
 */
function isConsentValid(savedAt: Date): boolean {
	const oneYearAgo = new Date();
	oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
	return savedAt > oneYearAgo;
}

/**
 * Check current consent state from localStorage
 *
 * SPR-280: 期限切れ（保存から1年超・日付が無い・壊れている）は null を返す＝
 * 「同意していない」と同じ扱いにして再確認へ倒す。以前は期限判定が
 * consent-mode-script.tsx 側にしか無く、バナーはこの関数が値を返す限り
 * 表示されないため、**期限を過ぎても再確認が出ない**状態だった。
 */
export function getCurrentConsentState(): ConsentState | null {
	if (typeof window === "undefined") return null;

	try {
		const saved = localStorage.getItem("consent-state");
		const savedAt = localStorage.getItem("consent-state-date");
		if (saved && savedAt && isConsentValid(new Date(savedAt))) {
			return normalizeConsentState(JSON.parse(saved));
		}
	} catch (_error) {
		// Silently handle parsing errors for consent state
	}

	return null;
}

/**
 * Update consent state
 */
export function updateConsent(consentState: ConsentState) {
	if (typeof window === "undefined") return;

	// Save to localStorage
	try {
		localStorage.setItem("consent-state", JSON.stringify(consentState));
		localStorage.setItem("consent-state-date", new Date().toISOString());
	} catch (_error) {
		// Silently handle localStorage errors for consent state
	}

	// Apply consent based on updated state
	// SPR-280: gtag への push は updateGoogleConsent に一本化（以前はここでも
	// 4フィールドだけの consent update を先に push しており、二重 push かつ
	// 一瞬だけ ad_user_data / ad_personalization を欠いた中間状態が存在した）
	updateGoogleConsent(consentState);
}

/**
 * Reset all consent to default state
 */
export function resetAllConsent() {
	const defaultState: ConsentState = {
		analytics: false,
		advertising: false,
		functional: true,
		personalization: false,
	};

	updateConsent(defaultState);

	// Clear any existing consent cookies/data
	try {
		localStorage.removeItem("consent-state");
		localStorage.removeItem("consent-state-date");
		localStorage.removeItem("age-verification");
	} catch (_error) {
		// Silently handle localStorage clear errors
	}
}

/**
 * Send a page view to Google Analytics
 *
 * SPR-299: 同意ゲートを外し、Cookie/識別子の可否は GA4 の consent mode に委ねる。
 * 非同意時は `analytics_storage: denied` の cookieless ping として送られ、
 * Cookie も識別子も保存されない（同意の意味を「識別子を保存するか」に純化した）。
 *
 * SPR-307: 送信形式を 2 回目の `config` から `gtag("event", "page_view")` に変更した。
 * 変更前は `process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` を読んで未設定なら早期 return して
 * いたが、この env はビルド時にしかバンドルへ埋め込まれない一方、本番では Cloud Run の
 * 実行時 env としてしか渡していない。結果クライアントでは常に `undefined` で、
 * **page_view が全訪問者・常に送られていなかった**（landingPage が (not set) 79%）。
 * event 形式は測定IDを必須にしないため、ID が無くても既定の送信先へ送られる＝
 * 同じ理由で黙って全滅する構造ではなくなる。SPA で推奨されている形でもある
 * （同一測定IDへの 2 回目の `config` は設定更新として扱われ、page_view 送信は保証されない）。
 *
 * @param url 送信するパス（クエリ込み）。省略時は現在地
 * @param measurementId 送信先の GA4 プロパティ。**Server Component から prop で渡す**
 * （[ga-measurement-id.ts](../analytics/ga-measurement-id.ts) 参照）。省略すると
 * 設定済みの全ターゲットに送られる。GTM 併用時に送信先を絞るためだけに使う
 * @returns 実際に送信したか。gtag 未ロードでは false を返すため、呼び出し側は再送を
 * 判断できる（未送信を「送信済み」と誤認すると landing page が欠ける）
 */
export function sendGoogleAnalyticsPageView(url?: string, measurementId?: string): boolean {
	if (typeof window === "undefined" || !window.gtag) return false;

	const path = url || `${window.location.pathname}${window.location.search}`;

	window.gtag("event", "page_view", {
		page_location: new URL(path, window.location.origin).href,
		page_title: document.title,
		// 未指定なら設定済みの全ターゲットに送る（ID が無いだけで欠測させない）
		...(measurementId ? { send_to: measurementId } : {}),
	});
	return true;
}

/**
 * Utility to send custom events to Google Analytics
 *
 * SPR-299: 同意ゲートを外した。理由は3つ。
 *
 * 1. **測れていなかった**。同意率 3.3%（1/30セッション）でカスタムイベント13種が本番0件。
 *    SPR-137 の成功指標がこの計器でしか測れないのに、母数が事実上存在しなかった（SPR-281 実測）。
 * 2. **線引きが恣意的だった**。GA4 タグは advanced consent mode で同意なしでもロードされ
 *    `session_start` / `scroll` / `video_start` / `user_engagement` を送っている。
 *    つまり「行動の集計は同意なしで送るが、自作イベントだけは送らない」という状態で、
 *    プライバシー上の区別として意味を成していなかった（送信元が Google か自分かの違いでしかない）。
 * 3. **同意の意味を純化できる**。可否は GA4 の consent mode に委ね、非同意時は
 *    `analytics_storage: denied` の cookieless ping として Cookie も識別子も保存せずに送る。
 *    同意は「識別子を保存するか」だけを意味し、イベント送信の可否とは分離される。
 *
 * privacy ページの記述もこの方針に合わせてある（同意がない場合も匿名の統計情報は送信される旨）。
 */
export function sendGoogleAnalyticsEvent(
	eventName: string,
	parameters: Record<string, string | number | boolean> = {},
) {
	if (typeof window === "undefined" || !window.gtag) return;

	window.gtag("event", eventName, parameters);
}
