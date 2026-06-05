import { describe, expect, it } from "vitest";
import type { UserWorkEvaluation } from "../../entities/user-evaluation";
import { calculateCharacteristicAverage, calculateEvaluationStats } from "../evaluation/aggregator";

const evaluation = (over: Partial<UserWorkEvaluation> = {}): UserWorkEvaluation => ({
	workId: "RJ1",
	userId: "u1",
	overallRating: 4,
	recommendedTags: [],
	isPublic: true,
	createdAt: "2024-01-01T00:00:00.000Z",
	updatedAt: "2024-01-01T00:00:00.000Z",
	...over,
});

describe("calculateCharacteristicAverage", () => {
	it("該当する値が無ければ undefined", () => {
		expect(calculateCharacteristicAverage([evaluation()], "pitch", "voiceQuality")).toBeUndefined();
	});

	it("指定カテゴリ・特性の平均値・評価者数を返す", () => {
		const evals = [
			evaluation({ voiceQuality: { pitch: { value: 4, evaluatorCount: 1 } } }),
			evaluation({ voiceQuality: { pitch: { value: 2, evaluatorCount: 1 } } }),
		];
		const result = calculateCharacteristicAverage(evals, "pitch", "voiceQuality");
		expect(result).toEqual({ value: 3, confidence: 0.2, evaluatorCount: 2 });
	});

	it("confidence は最大 1 にクランプされる", () => {
		const evals = Array.from({ length: 15 }, () =>
			evaluation({ personality: { maturity: { value: 5, evaluatorCount: 1 } } }),
		);
		const result = calculateCharacteristicAverage(evals, "maturity", "personality");
		expect(result?.confidence).toBe(1);
		expect(result?.value).toBe(5);
	});

	it("平均値は小数第2位に丸める", () => {
		const evals = [
			evaluation({ behaviorExpression: { energy: { value: 1, evaluatorCount: 1 } } }),
			evaluation({ behaviorExpression: { energy: { value: 2, evaluatorCount: 1 } } }),
			evaluation({ behaviorExpression: { energy: { value: 2, evaluatorCount: 1 } } }),
		];
		const result = calculateCharacteristicAverage(evals, "energy", "behaviorExpression");
		expect(result?.value).toBe(1.67);
	});

	it("attributeCharm カテゴリも集計できる", () => {
		const evals = [evaluation({ attributeCharm: { appeal: { value: 3, evaluatorCount: 1 } } })];
		const result = calculateCharacteristicAverage(evals, "appeal", "attributeCharm");
		expect(result?.value).toBe(3);
	});
});

describe("calculateEvaluationStats", () => {
	it("空配列なら平均 0・件数 0", () => {
		const stats = calculateEvaluationStats([]);
		expect(stats.totalEvaluations).toBe(0);
		expect(stats.averageRating).toBe(0);
		expect(stats.recentEvaluations).toEqual([]);
	});

	it("星別分布・平均・総数を集計する", () => {
		const stats = calculateEvaluationStats([
			evaluation({ overallRating: 5 }),
			evaluation({ overallRating: 5 }),
			evaluation({ overallRating: 3 }),
		]);
		expect(stats.ratingDistribution["5"]).toBe(2);
		expect(stats.ratingDistribution["3"]).toBe(1);
		expect(stats.totalEvaluations).toBe(3);
		expect(stats.averageRating).toBe(4.33);
	});

	it("recentEvaluations は公開のみを新しい順で最大10件返す", () => {
		const evals = [
			evaluation({ isPublic: false, createdAt: "2024-03-01T00:00:00.000Z" }),
			evaluation({ isPublic: true, createdAt: "2024-01-01T00:00:00.000Z" }),
			evaluation({ isPublic: true, createdAt: "2024-02-01T00:00:00.000Z" }),
		];
		const stats = calculateEvaluationStats(evals);
		expect(stats.recentEvaluations).toHaveLength(2);
		// 新しい順（2月 → 1月）
		expect(stats.recentEvaluations[0]?.createdAt).toBe("2024-02-01T00:00:00.000Z");
	});
});
