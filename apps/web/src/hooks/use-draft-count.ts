"use client";

import { useEffect, useState } from "react";
import { countMyButtonDrafts } from "@/actions/button-drafts";

/**
 * ページロード内での重複取得を防ぐモジュールキャッシュ。
 * ナビの「マーク N」バッジはデスクトップ（user-menu）とモバイル（mobile-menu）の
 * 両方が同時にマウントされうるため、Promise を共有して count() 集約を1回に抑える。
 */
let cache: Promise<number> | null = null;

/**
 * 表示中のバッジの購読者。SiteHeader はレイアウト常駐でソフトナビでは再マウントされないため、
 * キャッシュを捨てるだけでは再取得が走らない＝購読して能動的に押し込む必要がある。
 */
const subscribers = new Set<(count: number) => void>();

function fetchDraftCount(): Promise<number> {
	if (!cache) {
		cache = countMyButtonDrafts().catch(() => 0);
	}
	return cache;
}

/**
 * 下書きを作成・削除・消化したあとに呼ぶ。件数を取り直して表示中のバッジへ反映する。
 * 誰も表示していなければ次のマウントで取り直せば足りるので、無駄な集約は投げない。
 */
export function refreshDraftCount(): void {
	cache = null;
	if (subscribers.size === 0) {
		return;
	}
	void fetchDraftCount().then((value) => {
		for (const notify of subscribers) {
			notify(value);
		}
	});
}

/**
 * ナビ「マーク N」バッジ用の未仕上げ下書き件数。
 * 取得完了まで null（バッジ非表示）。0 件も非表示にする判断は表示側で行う。
 */
export function useDraftCount(enabled: boolean): number | null {
	const [count, setCount] = useState<number | null>(null);

	useEffect(() => {
		if (!enabled) {
			return;
		}
		let cancelled = false;
		const notify = (value: number) => {
			if (!cancelled) {
				setCount(value);
			}
		};
		subscribers.add(notify);
		void fetchDraftCount().then(notify);
		return () => {
			cancelled = true;
			subscribers.delete(notify);
		};
	}, [enabled]);

	return enabled ? count : null;
}
