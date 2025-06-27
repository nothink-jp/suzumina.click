/**
 * お気に入り関連の型定義
 */

import { z } from "zod";

/**
 * Firestoreに保存されるお気に入りデータ
 * users/{userId}/favorites/{favoriteId} に保存
 */
export const FirestoreFavoriteSchema = z.object({
	audioButtonId: z.string(),
	addedAt: z.string(), // ISO 8601 format
});

export type FirestoreFavoriteData = z.infer<typeof FirestoreFavoriteSchema>;

/**
 * お気に入り追加の入力
 */
export const AddFavoriteInputSchema = z.object({
	audioButtonId: z.string(),
});

export type AddFavoriteInput = z.infer<typeof AddFavoriteInputSchema>;

/**
 * お気に入り削除の入力
 */
export const RemoveFavoriteInputSchema = z.object({
	audioButtonId: z.string(),
});

export type RemoveFavoriteInput = z.infer<typeof RemoveFavoriteInputSchema>;

/**
 * お気に入り一覧クエリ
 */
export const FavoriteQuerySchema = z.object({
	limit: z.number().min(1).max(100).default(20),
	orderBy: z.enum(["newest", "oldest"]).default("newest"),
	startAfter: z.string().optional(),
});

export type FavoriteQuery = z.infer<typeof FavoriteQuerySchema>;

/**
 * お気に入り一覧の結果
 */
export const FavoriteListResultSchema = z.object({
	favorites: z.array(FirestoreFavoriteSchema),
	hasMore: z.boolean(),
	lastFavorite: FirestoreFavoriteSchema.optional(),
});

export type FavoriteListResult = z.infer<typeof FavoriteListResultSchema>;

/**
 * お気に入り状態の確認結果
 */
export const FavoriteStatusSchema = z.object({
	isFavorited: z.boolean(),
	favoriteId: z.string().optional(),
});

export type FavoriteStatus = z.infer<typeof FavoriteStatusSchema>;
