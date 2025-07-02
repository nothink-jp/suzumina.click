import type {
	AggregatedCharacteristics,
	CharacteristicAxis,
} from "@suzumina.click/shared-types/src/user-evaluation";

/**
 * モック特性評価データを生成
 */
export function generateMockCharacteristicData(workId: string): AggregatedCharacteristics {
	// workIdをシードとして使用し、同じ作品は同じデータを生成
	let seed = workId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	const originalRandom = Math.random;
	Math.random = () => {
		const x = Math.sin(seed++) * 10000;
		return x - Math.floor(x);
	};

	// ヘルパー関数：特性軸データを生成
	const generateAxis = (baseValue: number, variance = 0.5): CharacteristicAxis => {
		const value = Math.max(1, Math.min(5, baseValue + (Math.random() - 0.5) * variance * 2));
		const evaluatorCount = Math.floor(Math.random() * 50) + 5; // 5-55人
		const confidence = Math.min(1, evaluatorCount / 30); // 30人で最大信頼度

		return {
			value: Number(value.toFixed(2)),
			confidence: Number(confidence.toFixed(2)),
			evaluatorCount,
		};
	};

	// 声質・話し方のベース値設定
	const voiceQuality = {
		pitch: generateAxis(2.5 + Math.random() * 2), // 低音寄り～高音寄り
		clarity: generateAxis(2 + Math.random() * 1.5), // クリア寄り
		sweetness: generateAxis(2 + Math.random() * 2), // 甘い～クール
		speed: generateAxis(2.5 + Math.random() * 1.5), // ゆっくり～早口
		formality: generateAxis(2 + Math.random() * 2.5), // 丁寧語～タメ口
	};

	// 性格・内面のベース値設定
	const personality = {
		maturity: generateAxis(2 + Math.random() * 2.5), // 幼い～大人びた
		intelligence: generateAxis(2.5 + Math.random() * 2), // 天然～知的
		dominance: generateAxis(2 + Math.random() * 2), // 従順～支配的
		cunning: generateAxis(2 + Math.random() * 2.5), // 無邪気～あざとい
		independence: generateAxis(2.5 + Math.random() * 2), // 依存的～自立的
		emotionalStability: generateAxis(3 + Math.random() * 1.5), // 情緒安定寄り
	};

	// 行動・表現のベース値設定
	const behaviorExpression = {
		energy: generateAxis(2.5 + Math.random() * 2), // ダウナー～アッパー
		assertiveness: generateAxis(2 + Math.random() * 2.5), // 受け身～積極的
		affection: generateAxis(2.5 + Math.random() * 2), // ツン～デレ
		boldness: generateAxis(2 + Math.random() * 2.5), // 恥ずかしがり～大胆
	};

	// 属性・魅力のベース値設定
	const attributeCharm = {
		stimulation: generateAxis(2 + Math.random() * 3), // 癒し～高刺激
		style: generateAxis(2 + Math.random() * 2.5), // 清楚～ギャル
		appeal: generateAxis(2.5 + Math.random() * 2), // ピュア～セクシー
	};

	// 総合統計を計算
	const allAxes = [
		...Object.values(voiceQuality),
		...Object.values(personality),
		...Object.values(behaviorExpression),
		...Object.values(attributeCharm),
	];

	const totalEvaluations = Math.max(...allAxes.map((axis) => axis.evaluatorCount));
	const averageRating = allAxes.reduce((sum, axis) => sum + axis.value, 0) / allAxes.length;
	const recommendationRate = Math.max(0, Math.min(1, (averageRating - 2) / 3)); // 2-5を0-1にマップ

	// Math.randomを元に戻す
	Math.random = originalRandom;

	return {
		voiceQuality,
		personality,
		behaviorExpression,
		attributeCharm,
		overall: {
			averageRating: Number(averageRating.toFixed(2)),
			totalEvaluations,
			recommendationRate: Number(recommendationRate.toFixed(2)),
		},
		lastUpdated: new Date().toISOString(),
	};
}
