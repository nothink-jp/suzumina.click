import { z } from "zod";

/**
 * CreatorType Value Object
 *
 * クリエイターの役割を表現する値オブジェクト
 * DLsite作品におけるクリエイターの種類を扱う
 */
export const CreatorRole = z.enum([
	"voice", // 声優
	"illustration", // イラスト
	"scenario", // シナリオ
	"music", // 音楽
	"other", // その他
]);

export type CreatorRole = z.infer<typeof CreatorRole>;

/**
 * クリエイタータイプの日本語ラベル
 */
export const CREATOR_ROLE_LABELS: Record<CreatorRole, string> = {
	voice: "声優",
	illustration: "イラスト",
	scenario: "シナリオ",
	music: "音楽",
	other: "その他",
} as const;

/**
 * クリエイタータイプの優先順位
 * 表示時のソート順に使用
 */
export const CREATOR_ROLE_PRIORITY: Record<CreatorRole, number> = {
	voice: 1,
	scenario: 2,
	illustration: 3,
	music: 4,
	other: 5,
} as const;

/**
 * Creators Value Object
 *
 * 作品に関わる全クリエイター情報を集約
 */
export const CreatorsInfo = z
	.object({
		/** 声優リスト */
		voice: z.array(z.string()).default([]),
		/** シナリオライターリスト */
		scenario: z.array(z.string()).default([]),
		/** イラストレーターリスト */
		illustration: z.array(z.string()).default([]),
		/** 音楽制作者リスト */
		music: z.array(z.string()).default([]),
		/** その他の制作者リスト */
		other: z.array(z.string()).default([]),
	})
	.transform((data) => ({
		...data,
		/** 全クリエイターを取得 */
		getAll: (): Array<{ type: CreatorRole; name: string }> => {
			const result: Array<{ type: CreatorRole; name: string }> = [];

			(Object.keys(data) as CreatorRole[]).forEach((type) => {
				data[type].forEach((name) => {
					result.push({ type, name });
				});
			});

			return result.sort((a, b) => CREATOR_ROLE_PRIORITY[a.type] - CREATOR_ROLE_PRIORITY[b.type]);
		},
		/** クリエイターが存在するか */
		hasCreators: () => {
			return Object.values(data).some((creators) => creators.length > 0);
		},
		/** 特定タイプのクリエイター数 */
		countByType: (type: CreatorRole) => data[type].length,
		/** 全クリエイター数 */
		totalCount: () => {
			return Object.values(data).reduce((sum, creators) => sum + creators.length, 0);
		},
		/** 主要クリエイター（最初の各タイプ1名）を取得 */
		getPrimary: () => {
			const primary: Partial<Record<CreatorRole, string>> = {};

			(Object.keys(data) as CreatorRole[]).forEach((type) => {
				if (data[type].length > 0) {
					primary[type] = data[type][0];
				}
			});

			return primary;
		},
		/** 他のCreatorsInfoと等価か判定 */
		equals: (other: CreatorsInfo) => {
			return (Object.keys(data) as CreatorRole[]).every((type) => {
				const thisCreators = [...data[type]].sort();
				const otherCreators = [...other[type]].sort();
				return (
					thisCreators.length === otherCreators.length &&
					thisCreators.every((c, i) => c === otherCreators[i])
				);
			});
		},
	}));

export type CreatorsInfo = z.infer<typeof CreatorsInfo>;

/**
 * クリエイターユーティリティ
 */
export const CreatorUtils = {
	/**
	 * クリエイタータイプのラベルを取得
	 */
	getTypeLabel: (type: CreatorRole): string => {
		return CREATOR_ROLE_LABELS[type];
	},

	/**
	 * 複数のクリエイタータイプのラベルを取得
	 */
	getTypeLabels: (types: CreatorRole[]): string => {
		if (types.length === 0) return "";
		if (types.length === 1) {
			const firstType = types[0] as CreatorRole;
			return CREATOR_ROLE_LABELS[firstType] ?? firstType;
		}

		return types
			.map((type) => {
				const roleType = type as CreatorRole;
				return CREATOR_ROLE_LABELS[roleType] ?? type;
			})
			.join(" / ");
	},

	/**
	 * クリエイター配列を統合（重複除去）
	 */
	mergeCreators: (...creatorArrays: string[][]): string[] => {
		const merged = creatorArrays.flat();
		return [...new Set(merged)];
	},

	/**
	 * APIのcreater情報からCreatorsオブジェクトを構築
	 */
	fromApiCreaters: (creaters?: Array<{ type: string; name: string }>): CreatorsInfo => {
		const result: Record<string, string[]> = {
			voice: [],
			scenario: [],
			illustration: [],
			music: [],
			other: [],
		};

		if (!creaters) return CreatorsInfo.parse(result);

		creaters.forEach(({ type, name }) => {
			const normalizedType = type.toLowerCase();
			if (normalizedType in result && result[normalizedType]) {
				result[normalizedType]?.push(name);
			} else if (result.other) {
				result.other.push(name);
			}
		});

		// 重複除去
		Object.keys(result).forEach((type) => {
			result[type] = [...new Set(result[type])];
		});

		return CreatorsInfo.parse(result);
	},
};
