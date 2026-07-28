"use client";

import { useEffect, useState } from "react";
import { countMyButtonDrafts } from "@/actions/button-drafts";

/**
 * ページロード内での重複取得を防ぐモジュールキャッシュ。
 * ナビの「マーク N」バッジはデスクトップ（user-menu）とモバイル（mobile-menu）の
 * 両方が同時にマウントされうるため、Promise を共有して count() 集約を1回に抑える。
 */
let cache: Promise<number> | null = null;

function fetchDraftCount(): Promise<number> {
	if (!cache) {
		cache = countMyButtonDrafts().catch(() => 0);
	}
	return cache;
}

/** マーク（下書き）作成・削除後にバッジを最新化したい画面遷移で呼ぶ（次回マウントで再取得） */
export function invalidateDraftCount(): void {
	cache = null;
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
		void fetchDraftCount().then((value) => {
			if (!cancelled) {
				setCount(value);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [enabled]);

	return enabled ? count : null;
}
