"use client";

import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileRenderOptions {
	sitekey: string;
	callback: (token: string) => void;
	"expired-callback": () => void;
	"error-callback": () => void;
}

interface TurnstileApi {
	render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
	reset: (widgetId: string) => void;
	remove: (widgetId: string) => void;
}

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

let scriptPromise: Promise<TurnstileApi> | null = null;

/** api.js を 1 回だけ読み込む。失敗したら次回やり直せるよう Promise を捨てる */
function loadTurnstile(): Promise<TurnstileApi> {
	if (window.turnstile) return Promise.resolve(window.turnstile);
	if (!scriptPromise) {
		scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
			const script = document.createElement("script");
			script.src = SCRIPT_SRC;
			script.async = true;
			script.onload = () =>
				window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing"));
			script.onerror = () => reject(new Error("turnstile script failed to load"));
			document.head.appendChild(script);
		}).catch((err) => {
			scriptPromise = null;
			throw err;
		});
	}
	return scriptPromise;
}

interface TurnstileWidgetProps {
	siteKey: string;
	/** 新しいトークンを得たら token、失効・エラーで使えなくなったら null */
	onTokenChange: (token: string | null) => void;
	/** 値が変わるたびにウィジェットをリセットしてトークンを取り直す（トークンは使い捨てのため） */
	resetSignal: number;
	/** api.js の読み込みに失敗したとき */
	onLoadError: () => void;
}

/**
 * Cloudflare Turnstile のウィジェット。トークンの検証はサーバ側（`lib/turnstile.ts`）が正本で、
 * ここはトークンを取って親へ渡すだけ
 */
export function TurnstileWidget({
	siteKey,
	onTokenChange,
	resetSignal,
	onLoadError,
}: TurnstileWidgetProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<string | null>(null);
	// コールバックは render 時に 1 回だけ渡すため、最新の関数を ref 経由で呼ぶ
	const onTokenChangeRef = useRef(onTokenChange);
	const onLoadErrorRef = useRef(onLoadError);
	onTokenChangeRef.current = onTokenChange;
	onLoadErrorRef.current = onLoadError;

	useEffect(() => {
		let cancelled = false;
		loadTurnstile()
			.then((turnstile) => {
				if (cancelled || !containerRef.current) return;
				widgetIdRef.current = turnstile.render(containerRef.current, {
					sitekey: siteKey,
					callback: (token) => onTokenChangeRef.current(token),
					"expired-callback": () => onTokenChangeRef.current(null),
					"error-callback": () => onTokenChangeRef.current(null),
				});
			})
			.catch(() => {
				if (!cancelled) onLoadErrorRef.current();
			});
		return () => {
			cancelled = true;
			if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
			widgetIdRef.current = null;
		};
	}, [siteKey]);

	useEffect(() => {
		if (resetSignal === 0 || !widgetIdRef.current) return;
		onTokenChangeRef.current(null);
		window.turnstile?.reset(widgetIdRef.current);
	}, [resetSignal]);

	return <div ref={containerRef} data-testid="turnstile-widget" />;
}
