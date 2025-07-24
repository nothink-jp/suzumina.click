import type { AggregatedCharacteristics } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CharacteristicEvaluation from "../characteristic-evaluation";

// モックデータ
const mockCharacteristics: AggregatedCharacteristics = {
	voiceQuality: {
		pitch: { value: 3.5, confidence: 0.8, evaluatorCount: 15 },
		clarity: { value: 4.2, confidence: 0.9, evaluatorCount: 20 },
		sweetness: { value: 2.8, confidence: 0.7, evaluatorCount: 12 },
		speed: { value: 3.0, confidence: 0.6, evaluatorCount: 10 },
		formality: { value: 2.5, confidence: 0.8, evaluatorCount: 18 },
	},
	personality: {
		maturity: { value: 3.8, confidence: 0.7, evaluatorCount: 14 },
		intelligence: { value: 4.0, confidence: 0.9, evaluatorCount: 22 },
		dominance: { value: 2.2, confidence: 0.6, evaluatorCount: 11 },
		cunning: { value: 3.2, confidence: 0.8, evaluatorCount: 16 },
		independence: { value: 3.6, confidence: 0.7, evaluatorCount: 13 },
		emotionalStability: { value: 4.1, confidence: 0.8, evaluatorCount: 19 },
	},
	behaviorExpression: {
		energy: { value: 3.4, confidence: 0.7, evaluatorCount: 15 },
		assertiveness: { value: 2.9, confidence: 0.6, evaluatorCount: 12 },
		affection: { value: 4.3, confidence: 0.9, evaluatorCount: 25 },
		boldness: { value: 2.7, confidence: 0.5, evaluatorCount: 8 },
	},
	attributeCharm: {
		stimulation: { value: 3.7, confidence: 0.8, evaluatorCount: 17 },
		style: { value: 2.4, confidence: 0.7, evaluatorCount: 13 },
		appeal: { value: 3.9, confidence: 0.8, evaluatorCount: 21 },
	},
	overall: {
		averageRating: 3.45,
		totalEvaluations: 25,
		recommendationRate: 0.72,
	},
	lastUpdated: "2025-07-02T12:00:00Z",
};

describe("CharacteristicEvaluation", () => {
	describe("レンダリング", () => {
		it("特性評価データがある場合に正しく表示される", () => {
			render(<CharacteristicEvaluation characteristics={mockCharacteristics} />);

			// 総合統計の確認
			expect(screen.getByText("総合評価統計")).toBeInTheDocument();
			expect(screen.getAllByText("3.5")).toHaveLength(2); // 平均評価と軸の値
			expect(screen.getByText("25")).toBeInTheDocument(); // 総評価数
			expect(screen.getByText("72%")).toBeInTheDocument(); // 推奨率

			// 各カテゴリの表示確認
			expect(screen.getByText("声質・話し方")).toBeInTheDocument();
			expect(screen.getByText("性格・内面")).toBeInTheDocument();
			expect(screen.getByText("行動・表現")).toBeInTheDocument();
			expect(screen.getByText("属性・魅力")).toBeInTheDocument();
		});

		it("特性評価データがない場合にプレースホルダーが表示される", () => {
			render(<CharacteristicEvaluation />);

			// プレースホルダーメッセージの確認
			expect(screen.getByText("まだ評価データがありません")).toBeInTheDocument();
			expect(
				screen.getByText("ユーザーが評価を投稿すると、ここに統計情報が表示されます"),
			).toBeInTheDocument();

			// カテゴリ名は表示されている
			expect(screen.getByText("声質・話し方")).toBeInTheDocument();
			expect(screen.getByText("性格・内面")).toBeInTheDocument();
			expect(screen.getByText("行動・表現")).toBeInTheDocument();
			expect(screen.getByText("属性・魅力")).toBeInTheDocument();
		});
	});

	describe("軸表示", () => {
		it("声質・話し方の軸が正しく表示される", () => {
			render(<CharacteristicEvaluation characteristics={mockCharacteristics} />);

			// 音の高さ軸
			expect(screen.getByText("音の高さ")).toBeInTheDocument();
			expect(screen.getByText("低音")).toBeInTheDocument();
			expect(screen.getByText("高音")).toBeInTheDocument();
			expect(screen.getAllByText("15件の評価")).toHaveLength(2); // エネルギー軸も同じ値

			// 声の透明度軸
			expect(screen.getByText("声の透明度")).toBeInTheDocument();
			expect(screen.getByText("クリア")).toBeInTheDocument();
			expect(screen.getByText("ハスキー")).toBeInTheDocument();
		});

		it("性格・内面の軸が正しく表示される", () => {
			render(<CharacteristicEvaluation characteristics={mockCharacteristics} />);

			// 成熟度軸
			expect(screen.getByText("成熟度")).toBeInTheDocument();
			expect(screen.getByText("幼い")).toBeInTheDocument();
			expect(screen.getByText("大人びた")).toBeInTheDocument();

			// 知性軸
			expect(screen.getByText("知性")).toBeInTheDocument();
			expect(screen.getByText("天然")).toBeInTheDocument();
			expect(screen.getByText("知的")).toBeInTheDocument();
		});

		it("行動・表現の軸が正しく表示される", () => {
			render(<CharacteristicEvaluation characteristics={mockCharacteristics} />);

			// エネルギー軸
			expect(screen.getByText("エネルギー")).toBeInTheDocument();
			expect(screen.getByText("ダウナー")).toBeInTheDocument();
			expect(screen.getByText("アッパー")).toBeInTheDocument();

			// 愛情表現軸
			expect(screen.getByText("愛情表現")).toBeInTheDocument();
			expect(screen.getByText("ツン")).toBeInTheDocument();
			expect(screen.getByText("デレ")).toBeInTheDocument();
		});

		it("属性・魅力の軸が正しく表示される", () => {
			render(<CharacteristicEvaluation characteristics={mockCharacteristics} />);

			// 刺激度軸
			expect(screen.getByText("刺激度")).toBeInTheDocument();
			expect(screen.getByText("癒し")).toBeInTheDocument();
			expect(screen.getByText("高刺激")).toBeInTheDocument();

			// 魅力の種類軸
			expect(screen.getByText("魅力の種類")).toBeInTheDocument();
			expect(screen.getByText("ピュア")).toBeInTheDocument();
			expect(screen.getByText("セクシー")).toBeInTheDocument();
		});
	});

	describe("表示オプション", () => {
		it("showOverallStats=falseの場合に総合統計が表示されない", () => {
			render(
				<CharacteristicEvaluation characteristics={mockCharacteristics} showOverallStats={false} />,
			);

			// 総合統計は表示されない
			expect(screen.queryByText("総合評価統計")).not.toBeInTheDocument();

			// カテゴリは表示される
			expect(screen.getByText("声質・話し方")).toBeInTheDocument();
		});

		it("最終更新日が表示される", () => {
			render(<CharacteristicEvaluation characteristics={mockCharacteristics} />);

			expect(screen.getByText(/最終更新:/)).toBeInTheDocument();
		});
	});

	describe("数値表示", () => {
		it("評価値が正しく表示される", () => {
			render(<CharacteristicEvaluation characteristics={mockCharacteristics} />);

			// 具体的な評価値の確認
			expect(screen.getAllByText("3.5")).toHaveLength(2); // 平均評価とpitch value
			expect(screen.getByText("4.2")).toBeInTheDocument(); // clarity value
		});

		it("評価データがない軸は「未評価」と表示される", () => {
			const incompleteData: AggregatedCharacteristics = {
				voiceQuality: {
					pitch: { value: 3.5, confidence: 0.8, evaluatorCount: 15 },
					// clarity は意図的に省略
				},
				overall: {
					averageRating: 3.5,
					totalEvaluations: 15,
					recommendationRate: 0.7,
				},
				lastUpdated: "2025-07-02T12:00:00Z",
			};

			render(<CharacteristicEvaluation characteristics={incompleteData} />);

			// 未評価の表示確認
			expect(screen.getAllByText("未評価")).toHaveLength(17); // 18軸 - 1軸(pitch) = 17軸が未評価
		});
	});
});
