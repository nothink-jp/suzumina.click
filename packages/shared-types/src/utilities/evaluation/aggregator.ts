import type {
	AttributeCharm,
	BehaviorExpression,
	CharacteristicAxis,
	EvaluationStats,
	Personality,
	UserWorkEvaluation,
	VoiceQuality,
} from "../../entities/user-evaluation";

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
