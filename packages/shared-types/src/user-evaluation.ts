import { z } from "zod";

/**
 * ユーザー評価システム関連の型定義
 * 作品詳細ページの特性評価・個人評価・レビュー機能
 */

/**
 * 特性評価の各軸のZodスキーマ定義
 * 1-5の数値で評価（1が左側、5が右側の特性を示す）
 */
export const CharacteristicAxisSchema = z.object({
	/** 評価値（1-5） */
	value: z.number().min(1).max(5),
	/** 信頼度（評価数が多いほど高い） */
	confidence: z.number().min(0).max(1).optional(),
	/** この軸の評価者数 */
	evaluatorCount: z.number().int().nonnegative().default(0),
});

/**
 * 声質・話し方の特性評価のZodスキーマ定義
 */
export const VoiceQualitySchema = z.object({
	/** 低音 (1) ← → 高音 (5) */
	pitch: CharacteristicAxisSchema.optional(),
	/** クリア (1) ← → ハスキー (5) */
	clarity: CharacteristicAxisSchema.optional(),
	/** 甘い (1) ← → クール (5) */
	sweetness: CharacteristicAxisSchema.optional(),
	/** ゆっくり (1) ← → 早口 (5) */
	speed: CharacteristicAxisSchema.optional(),
	/** 丁寧語 (1) ← → タメ口 (5) */
	formality: CharacteristicAxisSchema.optional(),
});

/**
 * 性格・内面の特性評価のZodスキーマ定義
 */
export const PersonalitySchema = z.object({
	/** 幼い (1) ← → 大人びた (5) */
	maturity: CharacteristicAxisSchema.optional(),
	/** 天然 (1) ← → 知的 (5) */
	intelligence: CharacteristicAxisSchema.optional(),
	/** 従順 (1) ← → 支配的 (5) */
	dominance: CharacteristicAxisSchema.optional(),
	/** 無邪気 (1) ← → あざとい (5) */
	cunning: CharacteristicAxisSchema.optional(),
	/** 依存的 (1) ← → 自立的 (5) */
	independence: CharacteristicAxisSchema.optional(),
	/** 情緒安定 (1) ← → 情緒不安定 (5) */
	emotionalStability: CharacteristicAxisSchema.optional(),
});

/**
 * 行動・表現の特性評価のZodスキーマ定義
 */
export const BehaviorExpressionSchema = z.object({
	/** ダウナー (1) ← → アッパー (5) */
	energy: CharacteristicAxisSchema.optional(),
	/** 受け身 (1) ← → 積極的 (5) */
	assertiveness: CharacteristicAxisSchema.optional(),
	/** ツン (1) ← → デレ (5) */
	affection: CharacteristicAxisSchema.optional(),
	/** 恥ずかしがり (1) ← → 大胆 (5) */
	boldness: CharacteristicAxisSchema.optional(),
});

/**
 * 属性・魅力の特性評価のZodスキーマ定義
 */
export const AttributeCharmSchema = z.object({
	/** 癒し (1) ← → 高刺激 (5) */
	stimulation: CharacteristicAxisSchema.optional(),
	/** 清楚 (1) ← → ギャル (5) */
	style: CharacteristicAxisSchema.optional(),
	/** ピュア (1) ← → セクシー (5) */
	appeal: CharacteristicAxisSchema.optional(),
});

/**
 * 作品全体の特性評価集計のZodスキーマ定義
 */
export const AggregatedCharacteristicsSchema = z.object({
	/** 声質・話し方 */
	voiceQuality: VoiceQualitySchema.optional(),
	/** 性格・内面 */
	personality: PersonalitySchema.optional(),
	/** 行動・表現 */
	behaviorExpression: BehaviorExpressionSchema.optional(),
	/** 属性・魅力 */
	attributeCharm: AttributeCharmSchema.optional(),
	/** 総合評価統計 */
	overall: z.object({
		/** 平均評価 */
		averageRating: z.number().min(0).max(5),
		/** 評価数 */
		totalEvaluations: z.number().int().nonnegative(),
		/** 推奨率（4-5星評価の割合） */
		recommendationRate: z.number().min(0).max(1),
	}),
	/** 最終更新日 */
	lastUpdated: z.string().datetime(),
});

/**
 * 個人ユーザーの評価のZodスキーマ定義
 */
export const UserWorkEvaluationSchema = z.object({
	/** 作品ID */
	workId: z.string(),
	/** ユーザーID */
	userId: z.string(),
	/** 総合評価（1-5星） */
	overallRating: z.number().min(1).max(5),
	/** 声質・話し方評価 */
	voiceQuality: VoiceQualitySchema.optional(),
	/** 性格・内面評価 */
	personality: PersonalitySchema.optional(),
	/** 行動・表現評価 */
	behaviorExpression: BehaviorExpressionSchema.optional(),
	/** 属性・魅力評価 */
	attributeCharm: AttributeCharmSchema.optional(),
	/** レビューテキスト */
	reviewText: z.string().max(2000).optional(),
	/** おすすめタグ（ユーザーが追加） */
	recommendedTags: z.array(z.string()).max(10).default([]),
	/** 公開設定 */
	isPublic: z.boolean().default(true),
	/** 評価日 */
	createdAt: z.string().datetime(),
	/** 更新日 */
	updatedAt: z.string().datetime(),
});

/**
 * 評価統計情報のZodスキーマ定義
 */
export const EvaluationStatsSchema = z.object({
	/** 星別評価分布 */
	ratingDistribution: z.object({
		"1": z.number().int().nonnegative().default(0),
		"2": z.number().int().nonnegative().default(0),
		"3": z.number().int().nonnegative().default(0),
		"4": z.number().int().nonnegative().default(0),
		"5": z.number().int().nonnegative().default(0),
	}),
	/** 総評価数 */
	totalEvaluations: z.number().int().nonnegative(),
	/** 平均評価 */
	averageRating: z.number().min(0).max(5),
	/** 最新の評価10件 */
	recentEvaluations: z.array(UserWorkEvaluationSchema).max(10).default([]),
});

/**
 * 特性評価軸の定義（4分類18軸）
 */
export const CHARACTERISTIC_AXES = {
	voiceQuality: {
		pitch: { left: "低音", right: "高音" },
		clarity: { left: "クリア", right: "ハスキー" },
		sweetness: { left: "甘い", right: "クール" },
		speed: { left: "ゆっくり", right: "早口" },
		formality: { left: "丁寧語", right: "タメ口" },
	},
	personality: {
		maturity: { left: "幼い", right: "大人びた" },
		intelligence: { left: "天然", right: "知的" },
		dominance: { left: "従順", right: "支配的" },
		cunning: { left: "無邪気", right: "あざとい" },
		independence: { left: "依存的", right: "自立的" },
		emotionalStability: { left: "情緒安定", right: "情緒不安定" },
	},
	behaviorExpression: {
		energy: { left: "ダウナー", right: "アッパー" },
		assertiveness: { left: "受け身", right: "積極的" },
		affection: { left: "ツン", right: "デレ" },
		boldness: { left: "恥ずかしがり", right: "大胆" },
	},
	attributeCharm: {
		stimulation: { left: "癒し", right: "高刺激" },
		style: { left: "清楚", right: "ギャル" },
		appeal: { left: "ピュア", right: "セクシー" },
	},
} as const;

// 型エクスポート
export type CharacteristicAxis = z.infer<typeof CharacteristicAxisSchema>;
export type VoiceQuality = z.infer<typeof VoiceQualitySchema>;
export type Personality = z.infer<typeof PersonalitySchema>;
export type BehaviorExpression = z.infer<typeof BehaviorExpressionSchema>;
export type AttributeCharm = z.infer<typeof AttributeCharmSchema>;
export type AggregatedCharacteristics = z.infer<typeof AggregatedCharacteristicsSchema>;
export type UserWorkEvaluation = z.infer<typeof UserWorkEvaluationSchema>;
export type EvaluationStats = z.infer<typeof EvaluationStatsSchema>;

/**
 * 特性評価の更新用ヘルパー関数（新4分類対応）
 */
export function calculateCharacteristicAverage(
	evaluations: UserWorkEvaluation[],
	characteristic: string,
	category: "voiceQuality" | "personality" | "behaviorExpression" | "attributeCharm",
): CharacteristicAxis | undefined {
	const validValues: number[] = [];

	for (const evaluation of evaluations) {
		let categoryData: VoiceQuality | Personality | BehaviorExpression | AttributeCharm | undefined;

		if (category === "voiceQuality") {
			categoryData = evaluation.voiceQuality;
		} else if (category === "personality") {
			categoryData = evaluation.personality;
		} else if (category === "behaviorExpression") {
			categoryData = evaluation.behaviorExpression;
		} else if (category === "attributeCharm") {
			categoryData = evaluation.attributeCharm;
		}

		// biome-ignore lint/suspicious/noExplicitAny: Dynamic property access for characteristic evaluation
		const value = (categoryData as any)?.[characteristic]?.value;
		if (typeof value === "number") {
			validValues.push(value);
		}
	}

	if (validValues.length === 0) {
		return undefined;
	}

	const sum = validValues.reduce((acc, curr) => acc + curr, 0);
	const average = sum / validValues.length;
	const confidence = Math.min(validValues.length / 10, 1); // 10件以上で最大信頼度

	return {
		value: Number(average.toFixed(2)),
		confidence,
		evaluatorCount: validValues.length,
	};
}

/**
 * 評価統計の計算
 */
export function calculateEvaluationStats(evaluations: UserWorkEvaluation[]): EvaluationStats {
	const distribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
	let totalRating = 0;

	for (const evaluation of evaluations) {
		const rating = String(Math.floor(evaluation.overallRating)) as keyof typeof distribution;
		distribution[rating]++;
		totalRating += evaluation.overallRating;
	}

	const averageRating = evaluations.length > 0 ? totalRating / evaluations.length : 0;

	// 最新の評価10件（公開のみ）
	const recentEvaluations = evaluations
		.filter((evaluation) => evaluation.isPublic)
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.slice(0, 10);

	return {
		ratingDistribution: distribution,
		totalEvaluations: evaluations.length,
		averageRating: Number(averageRating.toFixed(2)),
		recentEvaluations,
	};
}
