/**
 * Circle Actions - ビジネスロジック（純粋関数）
 */

import type { CircleData, CircleUpdate } from "../models/circle-data";

/**
 * Circle に関するビジネスロジック
 */
export const CircleActions = {
	/**
	 * 作品追加
	 */
	addWork: (circle: CircleData, workId: string): CircleData => {
		if (circle.workIds.includes(workId)) return circle;

		return {
			...circle,
			workIds: [...circle.workIds, workId],
			totalWorks: (circle.totalWorks || circle.workIds.length) + 1,
			updatedAt: new Date().toISOString(),
		};
	},

	/**
	 * 作品削除
	 */
	removeWork: (circle: CircleData, workId: string): CircleData => {
		if (!circle.workIds.includes(workId)) return circle;

		return {
			...circle,
			workIds: circle.workIds.filter((id) => id !== workId),
			totalWorks: Math.max(0, (circle.totalWorks || circle.workIds.length) - 1),
			updatedAt: new Date().toISOString(),
		};
	},

	/**
	 * 新規サークル判定（90日以内）
	 */
	isNewCircle: (circle: CircleData): boolean => {
		if (!circle.createdAt) return false;
		const days = Math.floor(
			(Date.now() - new Date(circle.createdAt).getTime()) / (1000 * 60 * 60 * 24),
		);
		return days <= 90;
	},

	/**
	 * アクティブサークル判定（180日以内に作品投稿）
	 */
	isActive: (circle: CircleData): boolean => {
		if (!circle.latestWorkDate) return false;
		const days = Math.floor(
			(Date.now() - new Date(circle.latestWorkDate).getTime()) / (1000 * 60 * 60 * 24),
		);
		return days <= 180;
	},

	/**
	 * 作品数取得
	 */
	getWorkCount: (circle: CircleData): number => {
		return circle.totalWorks || circle.workIds.length;
	},

	/**
	 * 表示名取得
	 */
	getDisplayName: (circle: CircleData, preferEnglish = false): string => {
		if (preferEnglish && circle.nameEn) {
			return circle.nameEn;
		}
		return circle.name;
	},

	/**
	 * サークルページURL生成
	 */
	generateCircleUrl: (circle: CircleData): string => {
		return `https://www.dlsite.com/maniax/circle/profile/=/maker_id/${circle.id}.html`;
	},

	/**
	 * 部分更新の適用
	 */
	applyUpdate: (circle: CircleData, update: CircleUpdate): CircleData => ({
		...circle,
		...update,
		updatedAt: new Date().toISOString(),
	}),

	/**
	 * 統計情報の再計算
	 */
	recalculateStats: (circle: CircleData): CircleData => ({
		...circle,
		totalWorks: circle.workIds.length,
		updatedAt: new Date().toISOString(),
	}),
} as const;
