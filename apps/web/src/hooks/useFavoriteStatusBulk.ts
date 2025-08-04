/**
 * お気に入り状態一括取得フック
 *
 * 設計目標:
 * - API呼び出し数: 50回 → 1回 (98%削減)
 * - ページ単位でお気に入り状態を効率的に取得
 * - キャッシュ機能で重複リクエスト防止
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { getFavoritesStatusAction } from "@/actions/favorites";

interface UseFavoriteStatusBulkOptions {
	/** キャッシュ時間（ミリ秒） */
	cacheTime?: number;
	/** 自動取得の有効/無効 */
	enabled?: boolean;
}

interface CacheEntry {
	data: Map<string, boolean>;
	timestamp: number;
}

// グローバルキャッシュ（コンポーネント間で共有）
const favoriteCache = new Map<string, CacheEntry>();

/**
 * 音声ボタンのお気に入り状態を一括取得するフック
 */
export const useFavoriteStatusBulk = (
	audioButtonIds: string[],
	options: UseFavoriteStatusBulkOptions = {},
) => {
	const { cacheTime = 30000, enabled = true } = options; // 30秒キャッシュ

	const [favoriteStates, setFavoriteStates] = useState<Map<string, boolean>>(new Map());
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// キャッシュキーの生成（配列の内容で依存管理）
	// biome-ignore lint/correctness/useExhaustiveDependencies: audioButtonIds.join(",") は意図的に使用（無限ループ防止）
	const cacheKey = useMemo(() => {
		return [...audioButtonIds].sort().join(",");
	}, [audioButtonIds]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: audioButtonIds は cacheKey 経由で変更を検知（無限ループ防止）
	const fetchFavoriteStates = useCallback(async () => {
		if (!enabled || audioButtonIds.length === 0) {
			setFavoriteStates(new Map());
			return;
		}

		// キャッシュチェック
		const cached = favoriteCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < cacheTime) {
			setFavoriteStates(cached.data);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const result = await getFavoritesStatusAction(audioButtonIds);

			// キャッシュに保存
			favoriteCache.set(cacheKey, {
				data: result,
				timestamp: Date.now(),
			});

			setFavoriteStates(result);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "お気に入り状態の取得に失敗しました";
			setError(errorMessage);
			// エラーは上位コンポーネントのerror stateで処理

			// エラー時は空のMapを返す
			setFavoriteStates(new Map());
		} finally {
			setIsLoading(false);
		}
		// cacheKeyとその他の安定した値のみを依存にして無限ループを回避
	}, [cacheKey, cacheTime, enabled]);

	// 初期取得とaudioButtonIds変更時の再取得
	useEffect(() => {
		fetchFavoriteStates();
	}, [fetchFavoriteStates]);

	/**
	 * 特定の音声ボタンのお気に入り状態を取得
	 */
	const getFavoriteStatus = useCallback(
		(audioButtonId: string): boolean => {
			return favoriteStates.get(audioButtonId) || false;
		},
		[favoriteStates],
	);

	/**
	 * お気に入り状態を手動で更新（楽観的更新用）
	 */
	const updateFavoriteStatus = useCallback(
		(audioButtonId: string, isFavorite: boolean) => {
			setFavoriteStates((prev) => {
				const newMap = new Map(prev);
				newMap.set(audioButtonId, isFavorite);

				// キャッシュも更新
				const cached = favoriteCache.get(cacheKey);
				if (cached) {
					cached.data.set(audioButtonId, isFavorite);
				}

				return newMap;
			});
		},
		[cacheKey],
	);

	/**
	 * キャッシュをクリア
	 */
	const clearCache = useCallback(() => {
		favoriteCache.clear();
		setFavoriteStates(new Map());
	}, []);

	/**
	 * 手動で再取得
	 */
	const refetch = useCallback(() => {
		// 該当キャッシュを削除して再取得
		favoriteCache.delete(cacheKey);
		return fetchFavoriteStates();
	}, [cacheKey, fetchFavoriteStates]);

	return {
		/** お気に入り状態のMap */
		favoriteStates,
		/** 特定IDのお気に入り状態を取得 */
		getFavoriteStatus,
		/** ローディング状態 */
		isLoading,
		/** エラー状態 */
		error,
		/** お気に入り状態を楽観的更新 */
		updateFavoriteStatus,
		/** 手動で再取得 */
		refetch,
		/** キャッシュをクリア */
		clearCache,
		/** 統計情報 */
		stats: {
			totalIds: audioButtonIds.length,
			cachedCount: favoriteStates.size,
			cacheHit: favoriteCache.has(cacheKey),
		},
	};
};

/**
 * グローバルキャッシュの統計情報を取得
 */
export const getFavoriteCacheStats = () => {
	const now = Date.now();
	const entries = Array.from(favoriteCache.entries());

	return {
		totalEntries: entries.length,
		validEntries: entries.filter(([, entry]) => now - entry.timestamp < 30000).length,
		totalCachedIds: entries.reduce((sum, [, entry]) => sum + entry.data.size, 0),
	};
};

/**
 * 古いキャッシュエントリを削除
 */
export const cleanupFavoriteCache = (maxAge = 60000) => {
	const now = Date.now();
	for (const [key, entry] of favoriteCache.entries()) {
		if (now - entry.timestamp > maxAge) {
			favoriteCache.delete(key);
		}
	}
};
