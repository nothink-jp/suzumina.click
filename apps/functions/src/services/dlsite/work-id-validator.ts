/**
 * DLsite作品ID検証ユーティリティ
 * リージョン差異を考慮した柔軟な検証機能を提供
 */

import workIdsAsset from "../../assets/dlsite-work-ids.json";
import * as logger from "../../shared/logger";

interface WorkIdValidationResult {
	isValid: boolean;
	totalExpected: number;
	totalFound: number;
	coveragePercentage: number;
	missingCount: number;
	extraCount: number;
	regionWarning: boolean;
	details: {
		expectedButNotFound: string[];
		foundButNotExpected: string[];
	};
}

interface UnionWorkIdResult {
	currentRegionIds: string[];
	assetFileIds: string[];
	unionIds: string[];
	regionOnlyCount: number;
	assetOnlyCount: number;
	overlapCount: number;
	regionDifferenceDetected: boolean;
}

/**
 * 開発環境で収集した作品IDリストを読み込む
 */
function loadExpectedWorkIds(): Set<string> {
	try {
		return new Set(workIdsAsset.workIds);
	} catch (error) {
		logger.warn("作品IDリストファイルが読み込めませんでした。検証をスキップします。", { error });
		return new Set();
	}
}

/**
 * 作品IDリストを検証する
 * @param foundWorkIds 実際に取得された作品IDのリスト
 * @param options 検証オプション
 */
export function validateWorkIds(
	foundWorkIds: string[],
	options: {
		minCoveragePercentage?: number; // 最小カバレッジ率（デフォルト: 80%）
		maxExtraPercentage?: number; // 許容する追加作品の最大割合（デフォルト: 20%）
		logDetails?: boolean; // 詳細ログを出力するか（デフォルト: false）
	} = {},
): WorkIdValidationResult {
	const { minCoveragePercentage = 80, maxExtraPercentage = 20, logDetails = false } = options;

	const expectedIds = loadExpectedWorkIds();
	if (expectedIds.size === 0) {
		// リストが読み込めない場合は検証をスキップ
		return {
			isValid: true,
			totalExpected: 0,
			totalFound: foundWorkIds.length,
			coveragePercentage: 100,
			missingCount: 0,
			extraCount: 0,
			regionWarning: false,
			details: {
				expectedButNotFound: [],
				foundButNotExpected: [],
			},
		};
	}

	const foundIds = new Set(foundWorkIds);

	// 期待されているが見つからなかったID
	const expectedButNotFound = Array.from(expectedIds).filter((id) => !foundIds.has(id));

	// 見つかったが期待されていなかったID
	const foundButNotExpected = foundWorkIds.filter((id) => !expectedIds.has(id));

	// カバレッジ率の計算
	const coveragePercentage =
		((foundIds.size - foundButNotExpected.length) / expectedIds.size) * 100;

	// 追加作品の割合
	const extraPercentage = (foundButNotExpected.length / foundWorkIds.length) * 100;

	// リージョン差異の可能性を判定
	const regionWarning =
		expectedButNotFound.length > 10 || foundButNotExpected.length > 10 || coveragePercentage < 90;

	// 検証結果の判定
	const isValid =
		coveragePercentage >= minCoveragePercentage && extraPercentage <= maxExtraPercentage;

	// ログ出力
	if (regionWarning) {
		logger.warn("⚠️ リージョン差異の可能性があります", {
			coveragePercentage: Math.round(coveragePercentage),
			missingCount: expectedButNotFound.length,
			extraCount: foundButNotExpected.length,
		});
	}

	if (logDetails && expectedButNotFound.length > 0) {
		logger.warn("❌ 期待されたが見つからなかった作品ID（全件）:", {
			ids: expectedButNotFound,
			total: expectedButNotFound.length,
		});
	}

	if (logDetails && foundButNotExpected.length > 0) {
		logger.warn("⚠️ 予期しない作品ID（全件）:", {
			ids: foundButNotExpected,
			total: foundButNotExpected.length,
		});
	}

	logger.info("📊 作品ID検証結果", {
		totalExpected: expectedIds.size,
		totalFound: foundWorkIds.length,
		coveragePercentage: Math.round(coveragePercentage),
		isValid,
		regionWarning,
	});

	return {
		isValid,
		totalExpected: expectedIds.size,
		totalFound: foundWorkIds.length,
		coveragePercentage,
		missingCount: expectedButNotFound.length,
		extraCount: foundButNotExpected.length,
		regionWarning,
		details: {
			expectedButNotFound,
			foundButNotExpected,
		},
	};
}

/**
 * 作品IDが存在しない場合のエラー処理
 * @param result 検証結果
 */
export function handleNoWorkIdsError(result?: WorkIdValidationResult): void {
	if (result?.regionWarning) {
		logger.warn("🌏 リージョン差異により作品が取得できない可能性があります。", {
			suggestion: "Cloud Functionsのリージョン設定を確認してください",
			expectedRegion: "日本（asia-northeast1）",
		});
	} else {
		logger.error("❌ 作品IDが全く取得できませんでした。", {
			possibleCauses: [
				"DLsite APIの仕様変更",
				"HTMLパース処理のエラー",
				"ネットワークエラー",
				"リージョン制限",
			],
		});
	}
}

/**
 * 部分的な取得成功時の警告
 * @param result 検証結果
 */
export function warnPartialSuccess(result: WorkIdValidationResult): void {
	if (result.coveragePercentage < 50) {
		logger.warn("⚠️ 取得できた作品数が期待値を大幅に下回っています", {
			expected: result.totalExpected,
			found: result.totalFound,
			coveragePercentage: Math.round(result.coveragePercentage),
			action: "HTMLパース処理またはAPI応答を確認してください",
		});
	} else if (result.regionWarning) {
		logger.info("ℹ️ リージョン差異による作品リストの違いが検出されました", {
			note: "これは正常な動作の可能性があります",
			missingCount: result.missingCount,
			extraCount: result.extraCount,
		});
	}
}

/**
 * 現在のリージョンで取得可能なIDと保存済みIDリストの和集合を作成
 * @deprecated Cloud Functions では使用不要 - ローカルツール用に保持
 * @param currentRegionIds 現在のリージョンで取得されたID
 * @returns 和集合の結果
 */
export function createUnionWorkIds(currentRegionIds: string[]): UnionWorkIdResult {
	logger.warn("⚠️ createUnionWorkIds は非推奨です - ローカルツール用の機能");
	logger.info("🔄 作品ID和集合処理開始");

	// アセットファイルからIDを読み込み
	const assetFileIds = Array.from(loadExpectedWorkIds());

	// 重複除去
	const currentRegionSet = new Set(currentRegionIds);
	const assetFileSet = new Set(assetFileIds);

	// 和集合を作成
	const unionSet = new Set([...currentRegionIds, ...assetFileIds]);
	const unionIds = Array.from(unionSet).sort();

	// 集合演算
	const regionOnlyIds = currentRegionIds.filter((id) => !assetFileSet.has(id));
	const assetOnlyIds = assetFileIds.filter((id) => !currentRegionSet.has(id));
	const overlapIds = currentRegionIds.filter((id) => assetFileSet.has(id));

	// リージョン差異の検出
	const regionDifferenceDetected =
		assetOnlyIds.length > 10 ||
		regionOnlyIds.length > 10 ||
		currentRegionIds.length / assetFileIds.length < 0.8;

	const result: UnionWorkIdResult = {
		currentRegionIds,
		assetFileIds,
		unionIds,
		regionOnlyCount: regionOnlyIds.length,
		assetOnlyCount: assetOnlyIds.length,
		overlapCount: overlapIds.length,
		regionDifferenceDetected,
	};

	// ログ出力
	logger.info("📊 作品ID和集合結果", {
		currentRegion: currentRegionIds.length,
		assetFile: assetFileIds.length,
		union: unionIds.length,
		regionOnly: result.regionOnlyCount,
		assetOnly: result.assetOnlyCount,
		overlap: result.overlapCount,
		regionDifference: result.regionDifferenceDetected,
	});

	if (result.regionDifferenceDetected) {
		logger.warn("🌏 リージョン差異を検出しました", {
			suggestion: "和集合により不可視作品も取得を試行します",
			assetOnlyIds: assetOnlyIds
				.slice(0, 5)
				.concat(assetOnlyIds.length > 5 ? [`...他${assetOnlyIds.length - 5}件`] : []),
		});
	}

	return result;
}
