import type {
	AttributeCharm,
	BehaviorExpression,
	CharacteristicAxis,
	EvaluationStats,
	Personality,
	UserWorkEvaluation,
	VoiceQuality,
} from "../entities/user-evaluation";

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
	const confidence = Math.min(validValues.length / 10, 1);

	return {
		value: Number(average.toFixed(2)),
		confidence,
		evaluatorCount: validValues.length,
	};
}

export function calculateEvaluationStats(evaluations: UserWorkEvaluation[]): EvaluationStats {
	const distribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
	let totalRating = 0;

	for (const evaluation of evaluations) {
		const rating = String(Math.floor(evaluation.overallRating)) as keyof typeof distribution;
		distribution[rating]++;
		totalRating += evaluation.overallRating;
	}

	const averageRating = evaluations.length > 0 ? totalRating / evaluations.length : 0;

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
