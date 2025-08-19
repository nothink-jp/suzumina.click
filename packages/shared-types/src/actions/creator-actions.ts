/**
 * Creator Actions - ビジネスロジック（純粋関数）
 */

import type {
	CreatorData,
	CreatorType,
	CreatorUpdate,
	CreatorWorkMapping,
} from "../models/creator-data";

/**
 * Creator に関するビジネスロジック
 */
export const CreatorActions = {
	/**
	 * 作品追加
	 */
	addWork: (creator: CreatorData, workId: string): CreatorData => {
		if (creator.workIds.includes(workId)) return creator;

		return {
			...creator,
			workIds: [...creator.workIds, workId],
			updatedAt: new Date().toISOString(),
		};
	},

	/**
	 * 作品削除
	 */
	removeWork: (creator: CreatorData, workId: string): CreatorData => ({
		...creator,
		workIds: creator.workIds.filter((id) => id !== workId),
		updatedAt: new Date().toISOString(),
	}),

	/**
	 * ロール追加
	 */
	addRole: (creator: CreatorData, role: CreatorType): CreatorData => {
		if (creator.types.includes(role)) return creator;

		return {
			...creator,
			types: [...creator.types, role],
			updatedAt: new Date().toISOString(),
		};
	},

	/**
	 * 特定のロールを持つか判定
	 */
	hasRole: (creator: CreatorData, role: CreatorType): boolean => {
		return creator.types.includes(role);
	},

	/**
	 * 声優判定
	 */
	isVoiceActor: (creator: CreatorData): boolean => {
		return creator.types.includes("voiceActor");
	},

	/**
	 * イラストレーター判定
	 */
	isIllustrator: (creator: CreatorData): boolean => {
		return creator.types.includes("illustrator");
	},

	/**
	 * 作品数取得
	 */
	getWorkCount: (creator: CreatorData): number => {
		return creator.workIds.length;
	},

	/**
	 * プライマリロール取得
	 */
	getPrimaryRole: (creator: CreatorData): CreatorType | undefined => {
		// 優先順位: voiceActor > illustrator > scenario > music > producer > other
		const priority: CreatorType[] = [
			"voiceActor",
			"illustrator",
			"scenario",
			"music",
			"producer",
			"other",
		];
		return priority.find((role) => creator.types.includes(role));
	},

	/**
	 * 部分更新の適用
	 */
	applyUpdate: (creator: CreatorData, update: CreatorUpdate): CreatorData => ({
		...creator,
		...update,
		updatedAt: new Date().toISOString(),
	}),

	/**
	 * クリエイターと作品のマッピング作成
	 */
	createMapping: (
		creatorId: string,
		workId: string,
		roles: CreatorType[],
		creditedName?: string,
	): CreatorWorkMapping => ({
		creatorId,
		workId,
		roles,
		creditedName,
		createdAt: new Date().toISOString(),
	}),

	/**
	 * マッピングのロール更新
	 */
	updateMappingRoles: (mapping: CreatorWorkMapping, roles: CreatorType[]): CreatorWorkMapping => ({
		...mapping,
		roles,
	}),
} as const;
