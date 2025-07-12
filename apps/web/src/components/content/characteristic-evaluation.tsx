"use client";

import type {
	AggregatedCharacteristics,
	CharacteristicAxis,
} from "@suzumina.click/shared-types/src/user-evaluation";
import { CHARACTERISTIC_AXES } from "@suzumina.click/shared-types/src/user-evaluation";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Progress } from "@suzumina.click/ui/components/ui/progress";

interface CharacteristicEvaluationProps {
	/** 集計された特性評価データ */
	characteristics?: AggregatedCharacteristics;
	/** 総合評価情報の表示フラグ */
	showOverallStats?: boolean;
}

interface AxisDisplayProps {
	label: string;
	leftLabel: string;
	rightLabel: string;
	value?: CharacteristicAxis;
}

/**
 * 軸のキーから表示名を取得
 */
function getAxisDisplayName(key: string): string {
	const displayNames: Record<string, string> = {
		// 声質・話し方
		pitch: "音の高さ",
		clarity: "声の透明度",
		sweetness: "声の印象",
		speed: "話すスピード",
		formality: "話し方",
		// 性格・内面
		maturity: "成熟度",
		intelligence: "知性",
		dominance: "主導性",
		cunning: "したたかさ",
		independence: "自立性",
		emotionalStability: "感情の安定性",
		// 行動・表現
		energy: "エネルギー",
		assertiveness: "積極性",
		affection: "愛情表現",
		boldness: "大胆さ",
		// 属性・魅力
		stimulation: "刺激度",
		style: "スタイル",
		appeal: "魅力の種類",
	};
	return displayNames[key] || key;
}

/**
 * 特性軸の表示コンポーネント
 */
function CharacteristicAxisDisplay({ label, leftLabel, rightLabel, value }: AxisDisplayProps) {
	// デフォルト値（評価なし）
	const axisValue = value?.value ?? 3; // 中央値
	const confidence = value?.confidence ?? 0;
	const evaluatorCount = value?.evaluatorCount ?? 0;

	// 1-5の値を0-100%に変換
	const percentage = ((axisValue - 1) / 4) * 100;

	// 信頼度に基づく透明度
	const opacity = Math.max(0.3, confidence);

	return (
		<div className="space-y-2">
			{/* 軸ラベル */}
			<div className="flex justify-between items-center">
				<h4 className="text-sm font-medium text-gray-700">{label}</h4>
				{evaluatorCount > 0 && (
					<Badge variant="secondary" className="text-xs">
						{evaluatorCount}件の評価
					</Badge>
				)}
			</div>

			{/* 軸の範囲ラベル */}
			<div className="flex justify-between text-xs text-gray-500 mb-1">
				<span>{leftLabel}</span>
				<span>{rightLabel}</span>
			</div>

			{/* プログレスバー */}
			<div className="relative">
				<Progress value={percentage} className="h-3" style={{ opacity }} />
				{/* 中央線 */}
				<div className="absolute top-0 left-1/2 transform -translate-x-px h-3 w-0.5 bg-gray-400 opacity-50" />
				{/* 値のインジケーター */}
				<div
					className="absolute top-0 h-3 w-1 bg-gray-800 transform -translate-x-0.5"
					style={{ left: `${percentage}%` }}
				/>
			</div>

			{/* 数値表示 */}
			<div className="flex justify-center">
				<span className="text-xs text-gray-600">
					{evaluatorCount > 0 ? axisValue.toFixed(1) : "未評価"}
				</span>
			</div>
		</div>
	);
}

/**
 * カテゴリごとの特性評価表示
 */
function CategorySection({
	title,
	data,
	axes,
}: {
	title: string;
	data?: Record<string, CharacteristicAxis>;
	axes: Record<string, { left: string; right: string }>;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg font-semibold">{title}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{Object.entries(axes).map(([key, axis]) => (
					<CharacteristicAxisDisplay
						key={key}
						label={getAxisDisplayName(key)}
						leftLabel={axis.left}
						rightLabel={axis.right}
						value={data?.[key]}
					/>
				))}
			</CardContent>
		</Card>
	);
}

/**
 * 特性評価の全体表示コンポーネント
 */
export default function CharacteristicEvaluation({
	characteristics,
	showOverallStats = true,
}: CharacteristicEvaluationProps) {
	// 評価データが存在しない場合
	if (!characteristics) {
		return (
			<div className="space-y-6">
				{/* 総合統計（プレースホルダー） */}
				{showOverallStats && (
					<Card>
						<CardHeader>
							<CardTitle>総合評価統計</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-center text-gray-500 py-4">
								<p>まだ評価データがありません</p>
								<p className="text-sm mt-1">
									ユーザーが評価を投稿すると、ここに統計情報が表示されます
								</p>
							</div>
						</CardContent>
					</Card>
				)}

				{/* 各カテゴリ（プレースホルダー） */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<CategorySection title="声質・話し方" axes={CHARACTERISTIC_AXES.voiceQuality} />
					<CategorySection title="性格・内面" axes={CHARACTERISTIC_AXES.personality} />
					<CategorySection title="行動・表現" axes={CHARACTERISTIC_AXES.behaviorExpression} />
					<CategorySection title="属性・魅力" axes={CHARACTERISTIC_AXES.attributeCharm} />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* 総合統計 */}
			{showOverallStats && characteristics.overall && (
				<Card>
					<CardHeader>
						<CardTitle>総合評価統計</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="text-center">
								<div className="text-2xl font-bold text-primary">
									{characteristics.overall.averageRating.toFixed(1)}
								</div>
								<div className="text-sm text-gray-600">平均評価</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-gray-900">
									{characteristics.overall.totalEvaluations}
								</div>
								<div className="text-sm text-gray-600">総評価数</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-green-600">
									{(characteristics.overall.recommendationRate * 100).toFixed(0)}%
								</div>
								<div className="text-sm text-gray-600">推奨率</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* 各カテゴリの特性評価 */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<CategorySection
					title="声質・話し方"
					data={characteristics.voiceQuality}
					axes={CHARACTERISTIC_AXES.voiceQuality}
				/>
				<CategorySection
					title="性格・内面"
					data={characteristics.personality}
					axes={CHARACTERISTIC_AXES.personality}
				/>
				<CategorySection
					title="行動・表現"
					data={characteristics.behaviorExpression}
					axes={CHARACTERISTIC_AXES.behaviorExpression}
				/>
				<CategorySection
					title="属性・魅力"
					data={characteristics.attributeCharm}
					axes={CHARACTERISTIC_AXES.attributeCharm}
				/>
			</div>

			{/* 最終更新情報 */}
			{characteristics.lastUpdated && (
				<div className="text-center text-sm text-gray-500 mt-4">
					最終更新: {new Date(characteristics.lastUpdated).toLocaleDateString("ja-JP")}
				</div>
			)}
		</div>
	);
}
